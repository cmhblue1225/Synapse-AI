import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h2>
        <p className="mt-2 text-lg text-gray-600">
          죄송합니다. 요청하신 페이지가 존재하지 않습니다.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <HomeIcon className="-ml-1 mr-2 h-5 w-5" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};