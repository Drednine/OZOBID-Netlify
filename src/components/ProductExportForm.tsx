"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { OzonCredentials } from '@/lib/ozonApi';
import axios from 'axios';

interface ProductExportFormProps {
  userId: string;
  credentials: OzonCredentials;
}

interface FormValues {
  storeId: string;
  exportType: 'all' | 'selected';
  categoryId?: string;
}

const ProductExportForm: React.FC<ProductExportFormProps> = ({ userId, credentials }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const exportType = watch('exportType');

  useEffect(() => {
    const loadStores = async () => {
      setLoading(true);
      try {
        setTimeout(() => {
          setStores([
            { id: 'store1', name: 'Основной магазин' },
            { id: 'store2', name: 'Второй магазин' }
          ]);
          setLoading(false);
        }, 500);
      } catch (error) {
        setMessage('Ошибка при загрузке магазинов: ' + (error as Error).message);
        setLoading(false);
      }
    };

    loadStores();
  }, [userId]);

  const handleStoreSelect = async (storeId: string) => {
    setSelectedStore(storeId);
    setLoading(true);

    try {
      setTimeout(() => {
        setCategories([
          { id: 'cat1', name: 'Электроника' },
          { id: 'cat2', name: 'Одежда' },
          { id: 'cat3', name: 'Товары для дома' }
        ]);
        setLoading(false);
      }, 500);
    } catch (error) {
      setMessage('Ошибка при загрузке категорий: ' + (error as Error).message);
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    setExportProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      setTimeout(() => {
        clearInterval(progressInterval);
        setExportProgress(100);
        setMessage('Товары успешно выгружены');
        setLoading(false);
      }, 5000);
    } catch (error) {
      setMessage('Ошибка при выгрузке товаров: ' + (error as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Выгрузка товаров</h2>
      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('Ошибка') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* остальная разметка без изменений */}
      </form>
    </div>
  );
};

export default ProductExportForm;
