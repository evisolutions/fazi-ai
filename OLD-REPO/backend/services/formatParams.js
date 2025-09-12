const variableData = require('../variable_data.json');

function formatParams(params)  {
    let formattedParams = {
        roi_np_list: JSON.parse(params.roi_np_list),
        np_roi_filters: []
    }
    formattedParams.np_roi_filters = formatRoiNpList(formattedParams.roi_np_list);

    if (params.trziste_ids && params.trziste_ids !== "[]")
        formattedParams.trziste_ids = JSON.parse(params.trziste_ids);
    if (params.partner_ids && params.partner_ids !== "[]")
        formattedParams.partner_ids = JSON.parse(params.partner_ids);
    
    if (params.game_volatility_id)
        formattedParams.game_volatility_id = Number(params.game_volatility_id);

    if (params.game_feature_ids && params.game_feature_ids !== "[]")
        formattedParams.game_feature_ids = JSON.parse(params.game_feature_ids);
    if (params.game_category_ids && params.game_category_ids !== "[]")
        formattedParams.game_category_ids = JSON.parse(params.game_category_ids);

    if (params.hit_frequency_from)
        formattedParams.hit_frequency_from = Number(params.hit_frequency_from);
    if (params.hit_frequency_to)
        formattedParams.hit_frequency_to = Number(params.hit_frequency_to);

    if (params.max_exposure_from)
        formattedParams.max_exposure_from = Number(params.max_exposure_from);
    if (params.max_exposure_to)
        formattedParams.max_exposure_to = Number(params.max_exposure_to);

    if (params.min_max_bet_from)
        formattedParams.min_max_bet_from = Number(params.min_max_bet_from);
    if (params.min_max_bet_to)
        formattedParams.min_max_bet_to = Number(params.min_max_bet_to);

    if (params.game_release_start_date)
        formattedParams.game_release_start_date = new Date(params.game_release_start_date);
    if (params.game_release_end_date)
        formattedParams.game_release_end_date = new Date(params.game_release_end_date);

    return formattedParams;
}

function formatRoiNpList(roiNpList) {
    let groups = []
    roiNpList.forEach(item => {
        if (groups[item.np_id])
            groups[item.np_id].add(item.roi_id);
        else
        groups[item.np_id] = new Set([item.roi_id]);
    })

    let minRoiIdPerGroup = []
    groups.forEach((group, i) => {
        minRoiIdPerGroup.push({
            np_id: i,
            roi_ids: Array.from(group),
            min_roi_id: Math.min(...group),
        });
    })
    let roi_np_filters = []

    minRoiIdPerGroup.forEach(group => {
        let np_data = variableData.np_data.find(item => group.np_id === item.np_id);
        let min_roi_data = variableData.roi_data.find(item => group.min_roi_id === item.roi_id);
        roi_np_filters.push({
            np_id: np_data.np_id,
            roi_ids: group.roi_ids,
            np_from: np_data.from,
            np_to: np_data.to,
            roi_from: min_roi_data.from,
            roi_to: 10000000 // po algoritmu smo rekli da ide po grupacijama 
        });
    })

    return roi_np_filters;
}


module.exports = {
    formatParams
};