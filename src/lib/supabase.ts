export const getBudgetSettings = async (userId: string) => {
  // Заглушка для тестов
  return {
    data: {
      campaignBudgets: [
        { campaignId: 'cmp123', budget: 5000 },
        { campaignId: 'cmp456', budget: 10000 }
      ]
    },
    error: null
  };
};

export const updateBudgetSettings = async (userId: string, updatedSettings: any) => {
  // Заглушка для сохранения
  console.log(`Saving settings for ${userId}:`, updatedSettings);
  return {
    data: { success: true },
    error: null
  };
};
