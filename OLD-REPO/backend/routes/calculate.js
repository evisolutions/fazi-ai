const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const xlsxService = require('../services/xlsxService');
const {formatParams} = require('../services/formatParams');
const dataManipulator = require('../services/dataManipulator');

const router = express.Router();

// Configure multer for file uploads (temporary storage before moving to data directory)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow XLSX files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only XLSX files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Calculate endpoint with XLSX processing
router.post('/calculate', authenticateToken, upload.fields([{ name: 'training_data', maxCount: 1 }, { name: 'game_data', maxCount: 1 }]), async (req, res) => {
  try {

    // Extract parameters from request body
    const { 
      roi_np_list, 
      trziste_ids, 
      partner_ids, 
      game_volatility_id, 
      game_feature_ids, 
      game_category_ids, 
      hit_frequency_from, 
      hit_frequency_to, 
      max_exposure_from, 
      max_exposure_to, 
      min_max_bet_from, 
      min_max_bet_to, 
      game_release_start_date, 
      game_release_end_date,
      np_roi_filters
    } = formatParams(req.body);

    // Validate required parameters
    if (!roi_np_list || !Array.isArray(roi_np_list)) {
      return res.status(400).json({
        error: 'roi_np_list is required and must be an array of objects containing roi_id and np_id'
      });
    }

    // Validate roi_np_list structure
    const isValidRoiNpList = roi_np_list.every(item => 
      typeof item === 'object' && 
      item.hasOwnProperty('roi_id') && 
      item.hasOwnProperty('np_id')
    );
    
    if (!isValidRoiNpList) {
      return res.status(400).json({
        error: 'Each item in roi_np_list must contain roi_id and np_id properties'
      });
    }

    if (roi_np_list.length === 0) {
      return res.status(400).json({
        error: 'roi_np_list must contain at least one item'
      });
    }

    let training_data = null;
    let game_data = null;

    if (req.files.training_data) {
      let fileName = `training_data_${Date.now()}.xlsx`;
      let result = xlsxService.processXLSXFile(req.files.training_data[0], fileName, true);
      if (result.success)
        training_data = result.data;
      else 
        return res.status(400).json({
          error: 'Error processing training data file'
        });
    } else {
      let res = xlsxService.loadXLSXFromDataDirectory("training_data.xlsx");
      if (res.success)
        training_data = res.data;
      else
        return res.status(400).json({
          error: 'Error loading training data file'
        });
    }

    if (req.files.game_data) {
      let fileName = `game_data_${Date.now()}.xlsx`;
      let result = xlsxService.processXLSXFile(req.files.game_data[0], fileName);
      if (result.success)
        game_data = result.data;
      else 
        return res.status(400).json({
          error: 'Error processing game data file'
        });
    } else {
      let res = xlsxService.loadXLSXFromDataDirectory("all_games.xlsx");
      if (res.success)
        game_data = res.data;
      else
        return res.status(400).json({
          error: 'Error loading game data file'
        });
    }
    // remove Columns
    let game_data_columns = game_data.shift();
    let training_data_columns = training_data.shift();

    // APPLYING FILTERS  TO GAMSESE
    let game_data_filtered = dataManipulator.filterGameData(game_data, {
      game_volatility_id: game_volatility_id,
      game_feature_ids: game_feature_ids,
      game_category_ids: game_category_ids,
      hit_frequency_from: hit_frequency_from,
      hit_frequency_to: hit_frequency_to,
      max_exposure_from: max_exposure_from,
      max_exposure_to: max_exposure_to,
      min_max_bet_from: min_max_bet_from,
      min_max_bet_to: min_max_bet_to
    });

    // GAMES LEFT (IDS)
    let filtered_game_ids = dataManipulator.uniqueGameIds(game_data_filtered);

    // REMOVING DATA THAT USES REMOVED GAMES
    let training_data_filtered = dataManipulator.filterTrainingData(training_data, {
      trziste_ids,
      partner_ids, 
      filtered_game_ids
    })

    // GROUPING TRAINING DATA BY NP GROUPS 
    let grouped_training_data = dataManipulator.groupTrainingDataByNpRoi(training_data_filtered, np_roi_filters);
    
    // SORTING OF DATA IN PREPARATION FOR CALCULATIONS
    grouped_training_data.forEach((group) => {
      // sort by np amont and np percentage
      dataManipulator.sortByTwoColumns(group.data, 7, 17);
    });
    
    // TEST WRITES
    dataManipulator.test(game_data_filtered, "game_data_filtered.xlsx", [4]);
    dataManipulator.test(training_data_filtered, "training_data_filtered.xlsx", [15,16]);
    grouped_training_data.forEach((group,i) => {
      dataManipulator.test(group.data, "grouped_training_data_" + i + ".xlsx", [15,16]);
    });

    // TODO: CUTTOF GARBAGE DATAS BEFORE NEXT CALCULATIONS 


    // calculating data for relevant columns
    let dataNeededToCalculate= [
      {
        label: "Promo Amount",
        colIndex: 2
      },
      {
        label: "NP Percentage",
        colIndex: 17
      },
      {
        label: "NP Amount",
        colIndex: 7
      },
      {
        label: "Total Players Amount",
        colIndex: 8
      },
      {
        label: "GGR Amount",
        colIndex: 10
      },
      {
        label: "Rounds Played",
        colIndex: 11
      },
      {
        label: "ROI %",
        colIndex: 5
      },
      {
        label: "Session Time (min)",
        colIndex: 13
      }
    ]
    let calculated_data_by_group = [];
    grouped_training_data.forEach((group,i) => {

      let calculated_data = {
        "np_id": group.np_id,
        "roi_ids": group.roi_ids
      }

      dataNeededToCalculate.forEach((data_point) => {
        calculated_data[data_point.label] = dataManipulator.calculateMedianAverageStdDev(group.data, data_point.colIndex);
      })

      calculated_data_by_group.push(calculated_data)
      
    });

    let response = {
      message: 'Calculate operation completed successfully',
      data: {
        game_data_columns: game_data_columns,
        training_data_columns: training_data_columns,
        game_data_filtered: game_data_filtered,
        training_data_filtered: training_data_filtered,
        grouped_training_data: grouped_training_data,
        calculated_data_by_group: calculated_data_by_group
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Calculate API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
