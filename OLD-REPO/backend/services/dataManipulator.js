const xlsxService = require('./xlsxService');
const variableData = require('../variable_data.json');
const fs = require('fs');

class DataManipulator {
	constructor() { }

	deepCopy(data) {
		return JSON.parse(JSON.stringify(data));
	}

	test(data, name = "testxd.xlsx", dateColumnIndexes) {
		let result = xlsxService.saveDataToXLSXFile(data, name, dateColumnIndexes);
		if (!result.success)
			console.error("Error saving data to XLSX file:", result.error);
	}

	getAllUniqueValues(data, columnIndex) {
		const uniqueValues = new Set();
		data.forEach(row => {
			if (row[columnIndex]) {
				uniqueValues.add(row[columnIndex]);
			}
		});
		return Array.from(uniqueValues);
	}

	filterByVolatility(originalData, game_volatility_id) {
		// Find the volatility label from variable data
		const volatility = variableData.volatilities.find(v => v.volatility_id === game_volatility_id);
		if (!volatility) {
			console.log('skipping volatility filter');
			return originalData; // Return original data if ID not found
		}

		const volatilityLabel = volatility.label;
		const data = this.deepCopy(originalData);

		// Filter data where VolatilityID field (index 9) matches the label
		const filteredData = data.filter(row => {
			const rowVolatility = row[9]; // VolatilityID is at index 9
			return rowVolatility === volatilityLabel;
		});

		return filteredData;
	}

	filterByFeaturesAll(originalData, game_feature_ids) {

		// If no feature IDs provided, return original data
		if (!game_feature_ids || game_feature_ids.length === 0) {
			console.log('skipping feature (all) filter');
			return originalData;
		}

		// Map feature IDs to labels
		const requiredFeatureLabels = game_feature_ids.map(id => {
			const feature = variableData.features.find(f => f.feature_id === id);
			if (!feature) {
				console.warn(`Feature ID ${id} not found in variable data`);
				return null;
			}
			return feature.label;
		}).filter(label => label !== null); // Remove null values for missing IDs

		if (requiredFeatureLabels.length === 0) {
			console.warn('No valid feature IDs found');
			return originalData;
		}

		const data = this.deepCopy(originalData);
		// Filter data where Features field (index 13) contains ALL required features
		const filteredData = data.filter(row => {
			const rowFeatures = row[13]; // Features are at index 13
			if (!rowFeatures || typeof rowFeatures !== 'string') {
				return false;
			}

			// Split features by comma and trim whitespace
			const rowFeatureArray = rowFeatures.split(',').map(feature => feature.trim());

			// Check if ALL required features are present
			return requiredFeatureLabels.every(requiredFeature =>
				rowFeatureArray.includes(requiredFeature)
			);
		});

		return filteredData;
	}

	filterByFeaturesAny(originalData, game_feature_ids) {
		// If no feature IDs provided, return original data
		if (!game_feature_ids || game_feature_ids.length === 0) {
			console.log('skipping feature (any) filter');
			return originalData;
		}

		// Map feature IDs to labels
		const requiredFeatureLabels = game_feature_ids.map(id => {
			const feature = variableData.features.find(f => f.feature_id === id);
			if (!feature) {
				console.warn(`Feature ID ${id} not found in variable data`);
				return null;
			}
			return feature.label;
		}).filter(label => label !== null); // Remove null values for missing IDs

		if (requiredFeatureLabels.length === 0) {
			console.warn('No valid feature IDs found');
			return originalData;
		}

		const data = this.deepCopy(originalData);
		// Filter data where Features field (index 13) contains AT LEAST ONE required feature
		const filteredData = data.filter(row => {
			const rowFeatures = row[13]; // Features are at index 13
			if (!rowFeatures || typeof rowFeatures !== 'string') {
				return false;
			}

			// Split features by comma and trim whitespace
			const rowFeatureArray = rowFeatures.split(',').map(feature => feature.trim());

			// Check if ANY required feature is present
			return requiredFeatureLabels.some(requiredFeature =>
				rowFeatureArray.includes(requiredFeature)
			);
		});

		return filteredData;
	}

	filterByCategories(originalData, game_category_ids) {
		// If no category IDs provided, return original data
		if (!game_category_ids || game_category_ids.length === 0) {
			console.log('skipping category filter');
			return originalData;
		}

		// Map category IDs to labels
		const requiredCategoryLabels = game_category_ids.map(id => {
			const category = variableData.game_categories.find(c => c.game_category_id === id);
			if (!category) {
				console.warn(`Category ID ${id} not found in variable data`);
				return null;
			}
			return category.label;
		}).filter(label => label !== null); // Remove null values for missing IDs

		if (requiredCategoryLabels.length === 0) {
			console.warn('No valid category IDs found');
			return originalData;
		}

		const data = this.deepCopy(originalData);

		// Filter data where GameCategoryID field (index 1) matches ANY of the required categories
		const filteredData = data.filter(row => {
			const rowCategory = row[1]; // GameCategoryID is at index 1
			if (!rowCategory) {
				return false;
			}

			// Check if the row's category is in the required categories list
			return requiredCategoryLabels.includes(rowCategory);
		});

		return filteredData;
	}

	filterByHitFrequency(originalData, hit_frequency_from, hit_frequency_to) {
		// If no range provided at all, return original data
		if ((hit_frequency_from === null || hit_frequency_from === undefined) &&
			(hit_frequency_to === null || hit_frequency_to === undefined)) {
			console.log('skipping hit frequency filter');
			return originalData;
		}

		const data = this.deepCopy(originalData);

		// Filter data where HitFrequency field (index 10) falls within the range
		const filteredData = data.filter(row => {
			const rowHitFrequency = row[10]; // HitFrequency is at index 10
			if (!rowHitFrequency) {
				return false;
			}

			// Convert string to number
			const hitFrequencyNum = parseFloat(rowHitFrequency);

			// Skip rows where conversion failed
			if (isNaN(hitFrequencyNum)) {
				console.warn(`Invalid hit frequency value: ${rowHitFrequency}`);
				return false;
			}

			// Check based on which parameters are provided
			let passesFromCheck = true;
			let passesToCheck = true;

			// Check "from" condition if provided
			if (hit_frequency_from !== null && hit_frequency_from !== undefined) {
				passesFromCheck = hitFrequencyNum >= hit_frequency_from;
			}

			// Check "to" condition if provided
			if (hit_frequency_to !== null && hit_frequency_to !== undefined) {
				passesToCheck = hitFrequencyNum <= hit_frequency_to;
			}

			// Must pass both conditions (if they exist)
			return passesFromCheck && passesToCheck;
		});

		return filteredData;
	}

	filterByMaxExposure(originalData, max_exposure_from, max_exposure_to) {
		// If no range provided at all, return original data
		if ((max_exposure_from === null || max_exposure_from === undefined) &&
			(max_exposure_to === null || max_exposure_to === undefined)) {
			console.log('skipping max exposure filter');
			return originalData;
		}

		const data = this.deepCopy(originalData);

		// Filter data where MaxExposure field (index 11) falls within the range
		const filteredData = data.filter(row => {
			const rowMaxExposure = row[11]; // MaxExposure is at index 11
			if (!rowMaxExposure) {
				return false;
			}

			// Convert string to number
			const maxExposureNum = parseFloat(rowMaxExposure);

			// Skip rows where conversion failed
			if (isNaN(maxExposureNum)) {
				console.warn(`Invalid max exposure value: ${rowMaxExposure}`);
				return false;
			}

			// Check based on which parameters are provided
			let passesFromCheck = true;
			let passesToCheck = true;

			// Check "from" condition if provided
			if (max_exposure_from !== null && max_exposure_from !== undefined) {
				passesFromCheck = maxExposureNum >= max_exposure_from;
			}

			// Check "to" condition if provided
			if (max_exposure_to !== null && max_exposure_to !== undefined) {
				passesToCheck = maxExposureNum <= max_exposure_to;
			}

			// Must pass both conditions (if they exist)
			return passesFromCheck && passesToCheck;
		});

		return filteredData;
	}

	filterByMinMaxBet(originalData, min_max_bet_from, min_max_bet_to) {
		// If no range provided at all, return original data
		if ((min_max_bet_from === null || min_max_bet_from === undefined) &&
			(min_max_bet_to === null || min_max_bet_to === undefined)) {
			console.log('skipping min/max bet filter');
			return originalData;
		}

		const data = this.deepCopy(originalData);

		// Filter data where MinAndMaxBet field (index 12) falls completely within the range
		const filteredData = data.filter(row => {
			const rowMinMaxBet = row[12]; // MinAndMaxBet is at index 12
			if (!rowMinMaxBet || typeof rowMinMaxBet !== 'string') {
				return false;
			}

			// Skip if "/" is the only character
			if (rowMinMaxBet === '/' || rowMinMaxBet === '') {
				return false;
			}

			// Split by "/" to get min and max bet values
			const betParts = rowMinMaxBet.split('/');
			if (betParts.length !== 2) {
				console.warn(`Invalid min/max bet format: ${rowMinMaxBet}`);
				return false;
			}

			// Convert to numbers
			const rowMinBet = parseFloat(betParts[0]);
			const rowMaxBet = parseFloat(betParts[1]);

			// Skip rows where conversion failed
			if (isNaN(rowMinBet) || isNaN(rowMaxBet)) {
				console.warn(`Invalid min/max bet values: ${rowMinMaxBet}`);
				return false;
			}

			// Check based on which parameters are provided
			let passesFromCheck = true;
			let passesToCheck = true;

			// Check "from" condition if provided - row's minimum bet must be >= filter minimum
			if (min_max_bet_from !== null && min_max_bet_from !== undefined) {
				console.log("from", rowMinBet, min_max_bet_from, rowMinBet >= min_max_bet_from);
				passesFromCheck = rowMinBet >= min_max_bet_from;
			}

			// Check "to" condition if provided - row's maximum bet must be <= filter maximum
			if (min_max_bet_to !== null && min_max_bet_to !== undefined) {
				console.log("to", rowMaxBet, min_max_bet_to, rowMaxBet <= min_max_bet_to);
				passesToCheck = rowMaxBet <= min_max_bet_to;
			}

			// Must pass both conditions (if they exist) - entire bet range must fall within filter range
			return passesFromCheck && passesToCheck;
		});

		return filteredData;
	}

	uniqueGameIds(game_data) {
		let game_ids = new Set();
		game_data.map(row => game_ids.add(row[0]));
		game_ids = Array.from(game_ids);
		return game_ids;
	}

	filterGameData(game_data, params) {
		let filter_volatility = this.filterByVolatility(game_data, params.game_volatility_id);
		let filter_category = this.filterByCategories(filter_volatility, params.game_category_ids);
		let filter_feature_any = this.filterByFeaturesAny(filter_category, params.game_feature_ids);
		let filter_hit_frequency = this.filterByHitFrequency(filter_feature_any, params.hit_frequency_from, params.hit_frequency_to);
		let filter_max_exposure = this.filterByMaxExposure(filter_hit_frequency, params.max_exposure_from, params.max_exposure_to);
		let filter_min_max_bet = this.filterByMinMaxBet(filter_max_exposure, params.min_max_bet_from, params.min_max_bet_to);
		return filter_min_max_bet;
	}

	filterTrainingData(training_data, params) {
		let {
			trziste_ids,
			partner_ids,
			filtered_game_ids
		} = params;
		let filter_games = null;
		if (filtered_game_ids && filtered_game_ids.length > 0)
			filter_games = training_data.filter(row => filtered_game_ids.includes(Number(row[1])));
		if (trziste_ids && trziste_ids.length > 0)
			filter_games = filter_games.filter(row => trziste_ids.includes(Number(row[3])));
		if (partner_ids && partner_ids.length > 0)
			filter_games = filter_games.filter(row => partner_ids.includes(Number(row[4])));

		return filter_games;
	}

	groupTrainingDataByNpRoi(training_data, np_roi_filters) {
		let data = this.deepCopy(training_data);
		let grouped_training_data = [];

		np_roi_filters.forEach((filter, i) => {
			let filtered_training_data = null;

			// filtering by np
			filtered_training_data = data.filter(row => {
				let npPercent = Number(row[17]);
				return npPercent >= filter.np_from && npPercent <= filter.np_to;
			});

			// filtering by roi
			filtered_training_data = filtered_training_data.filter(row => {
				let roi = Number(row[5]);
				return roi >= filter.roi_from && roi <= filter.roi_to;
			});

			let group = {
				np_id: filter.np_id,
				roi_ids: filter.roi_ids,
				data: filtered_training_data,
				id: i
			}

			grouped_training_data.push(group);

		});

		return grouped_training_data;
	}

	calculateMedianAverageStdDev(matrix, colIndex, useSampleSD = false) {
		// extract values from the column
		let values = matrix.map(row => Number(row[colIndex])).filter(v => !isNaN(v));
	
		if (values.length === 0) {
			return { average: null, median: null, stdDev: null };
		}
	
		// Average 
		let sum = values.reduce((a, b) => a + b, 0);
		let average = sum / values.length;
	
		// Median 
		let sorted = [...values].sort((a, b) => a - b);
		let mid = Math.floor(sorted.length / 2);
		let median = (sorted.length % 2 === 0)
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	
		// Standard Deviation
		let variance = values.reduce((acc, x) => acc + Math.pow(x - average, 2), 0);
		variance = variance / (useSampleSD ? (values.length - 1) : values.length);
		let stdDev = Math.sqrt(variance);
	
		return { average, median, stdDev };
	}

	// MUTATES ORIGINAL DATA
	sortByOneColumn(originalData, col) {
		return originalData.sort((a, b) => {
			let vala = Number(a[col]);
			let valb = Number(b[col]);
			return valb - vala;
		});
	}

	// MUTATES ORIGINAL DATA
	sortByTwoColumns(originalData, col1, col2) {
		return originalData.sort((a, b) => {
			let vala1 = Number(a[col1]);
			let vala2 = Number(a[col2]);
			let valb1 = Number(b[col1]);
			let valb2 = Number(b[col2]);
			
			if (vala1 !== valb1) {
				return valb1 - vala1;
			} else {
				return valb2 - vala2;
			}
		});
	}

	// USED ONLY BEFORE SAVING TRAINING DATA 
	calculateNPPercentage(training_data) {
		if (!training_data || !Array.isArray(training_data) || training_data.length === 0) {
			return training_data;
		}

		const data = this.deepCopy(training_data);

		// Process each row
		data.forEach((row, index) => {
			if (!Array.isArray(row)) {
				return;
			}

			// First row is header - add "NP%" at index 17
			if (index === 0) {
				// Ensure the row has enough columns, fill with empty strings if needed
				while (row.length < 17) {
					row.push('');
				}
				row[17] = 'NP%';
				return;
			}

			// For data rows, calculate the percentage
			const idx7Value = row[7];
			const idx8Value = row[8];

			let npPercentage = 0;

			// Check if both values are present and are numbers
			if (idx7Value !== null && idx7Value !== undefined && idx7Value !== '' &&
				idx8Value !== null && idx8Value !== undefined && idx8Value !== '') {

				const num7 = parseFloat(idx7Value);
				const num8 = parseFloat(idx8Value);

				// Check if both conversions were successful and idx8 is not zero
				if (!isNaN(num7) && !isNaN(num8) && num8 !== 0) {
					npPercentage = (num7 / num8) * 100;
				}
			}

			// Ensure the row has enough columns, fill with empty strings if needed
			while (row.length < 17) {
				row.push('');
			}

			// Set the calculated percentage at index 17
			row[17] = npPercentage;
		});

		return data;
	}

}

module.exports = new DataManipulator();