"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getCampaignsList, updateBids, OzonCredentials, BidUpdate } from '@/lib/ozonApi';

interface BidManagementFormProps {
  userId: string;
  credentials: OzonCredentials;
}

interface FormValues {
  campaignId: string | null;
  productId: string;
  newBid: number;
}

const BidManagementForm: React.FC<BidManagementFormProps> = ({ userId, credentials }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      const { data: campaignsData, error: campaignsError } = await getCampaignsList(credentials);

      if (campaignsError) {
        setMessage('Ошибка при загрузке кампаний: ' + (campaignsError as Error).message);
      } else if (campaignsData) {
        setCampaigns(campaignsData.campaigns || []);
      }

      setLoading(false);
    };
    loadCampaigns();
  }, [credentials]);

  const handleCampaignSelect = async (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setValue('campaignId', campaignId);
    setLoading(true);
    setTimeout(() => {
      setProducts([
        { id: 'product1', name: 'Товар 1', currentBid: 100 },
        { id: 'product2', name: 'Товар 2', currentBid: 150 },
        { id: 'product3', name: 'Товар 3', currentBid: 200 }
      ]);
      setLoading(false);
    }, 500);
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue('productId', productId);
      setValue('newBid', product.currentBid);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');

    try {
      const finalCampaignId = (data.campaignId ?? selectedCampaign) as string;

      if (!finalCampaignId) {
        throw new Error('Не выбрана кампания');
      }

      const bidUpdate: BidUpdate = {
        campaignId: finalCampaignId,
        productId: data.productId,
        newBid: data.newBid
      };

      const { error } = await updateBids(credentials, [bidUpdate]);

      if (error) {
        throw new Error('Ошибка при обновлении ставки: ' + (error as Error).message);
      }

      setMessage('Ставка успешно обновлена');

      setProducts(products.map(product =>
        product.id === data.productId
          ? { ...product, currentBid: data.newBid }
          : product
      ));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Управление ставками</h2>

      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('Ошибка') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Выберите кампанию</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            defaultValue=""
            {...register('campaignId', {
              required: 'Выберите кампанию',
              onChange: (e) => {
                const value = e.target.value;
                handleCampaignSelect(value);
              }
            })}
          >
            <option value="" disabled>Выберите кампанию</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          {errors.campaignId && <p className="text-red-500 mt-1">{errors.campaignId.message}</p>}
        </div>

        {selectedCampaign && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Выберите товар</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              defaultValue=""
              {...register('productId', { required: 'Выберите товар' })}
              onChange={(e) => handleProductSelect(e.target.value)}
            >
              <option value="" disabled>Выберите товар</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} (текущая ставка: {product.currentBid} руб.)
                </option>
              ))}
            </select>
            {errors.productId && <p className="text-red-500 mt-1">{errors.productId.message}</p>}
          </div>
        )}

        {selectedCampaign && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Новая ставка (руб.)</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              {...register('newBid', {
                required: 'Это поле обязательно',
                min: { value: 1, message: 'Минимальная ставка 1 руб.' }
              })}
            />
            {errors.newBid && <p className="text-red-500 mt-1">{errors.newBid.message}</p>}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
          disabled={loading || !selectedCampaign}
        >
          {loading ? 'Обновление...' : 'Обновить ставку'}
        </button>
      </form>
    </div>
  );
};

export default BidManagementForm;
