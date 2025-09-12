import { ref } from 'vue'
import { defineStore } from 'pinia'
import variable_data from '@/assets/variable_data.json'

export const useGambaStore = defineStore('gamba', () => {

	const available_trziste_data = ref(JSON.parse(JSON.stringify(variable_data.available_trziste_data)))

	const available_partner_data = ref(JSON.parse(JSON.stringify(variable_data.available_partner_data)))

	const roi_np_table_data = ref(JSON.parse(JSON.stringify(variable_data.roi_np_table_data)))

	const volatility_data = ref(JSON.parse(JSON.stringify(variable_data.volatilities)))

	const feature_data = ref(JSON.parse(JSON.stringify(variable_data.features)))

	const game_category_data = ref(JSON.parse(JSON.stringify(variable_data.game_categories)))

	const getNPLabelFromID = (id: number) => {
		return variable_data.np_data.find((item: any) => item.np_id === id)?.label;
	}

	const getROILabelFromID = (id: number) => {
		return variable_data.roi_data.find((item: any) => item.roi_id === id)?.label;
	}

	return {
		available_trziste_data,
		available_partner_data, 
		roi_np_table_data, 
		volatility_data, 
		feature_data, 
		game_category_data,
		getNPLabelFromID,
		getROILabelFromID
	}
})
