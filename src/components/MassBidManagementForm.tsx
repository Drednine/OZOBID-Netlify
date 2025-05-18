"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getCampaignsList, updateBids, getCampaignProducts, OzonCredentials } from '@/lib/ozonApi';

interface MassBidManagementFormProps {
  userId: string;
  credentials: OzonCredentials;
}

const MassBidManagementForm: React.FC<MassBidManagementFormProps> = ({ userId, credentials }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      campaignId: '', // ✅ добавлено для устранения ошибки типов
      bidAction: 'set',
      bidValue: 100,
      minBid: 50,
      maxBid: 500
    }
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await getCampaignsList(credentials);
      if (data && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignSelect = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data } = await getCampaignProducts(credentials, campaignId);
      if (data && data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (selectedProducts.size === 0) return;

    setLoading(true);
    try {
      const bidUpdates = Array.from(selectedProducts).map(productId => ({
        campaignId: data.campaignId,
        productId,
        newBid: data.bidValue
      }));

      await updateBids(credentials, bidUpdates);
      setMessage('Ставки успешно обновлены');
    } catch (error) {
      console.error(error);
      setMessage('Ошибка при обновлении ставок');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Массовое управление ставками</h2>

      {message && <div>{message}</div>}

      <div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label>Выберите кампанию</label>
            <select
              {...register('campaignId', {
                onChange: (e) => handleCampaignSelect(e.target.value)
              })}
            >
              <option value=''>Выберите кампанию</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Новая ставка (руб.)</label>
            <input type='number' {...register('bidValue')} />
          </div>

          <button type='submit' disabled={loading || selectedProducts.size === 0}>
            {loading ? 'Обновление...' : 'Обновить ставки'}
          </button>
        </form>
      </div>

      <div>
        <h3>Товары в кампании</h3>
        <div>
          Выбрано: {selectedProducts.size} из {products.length}
        </div>

        {products.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Выбрать</th>
                <th>Название</th>
                <th>Текущая ставка</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type='checkbox'
                      onChange={() => {
                        const newSelected = new Set(selectedProducts);
                        if (newSelected.has(product.id)) {
                          newSelected.delete(product.id);
                        } else {
                          newSelected.add(product.id);
                        }
                        setSelectedProducts(newSelected);
                      }}
                    />
                  </td>
                  <td>{product.name}</td>
                  <td>{product.bid} руб.</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>{loading ? 'Загрузка...' : 'Нет товаров для отображения'}</div>
        )}
      </div>
    </div>
  );
};

export default MassBidManagementForm;
