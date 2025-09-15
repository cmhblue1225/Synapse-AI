import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Outlet />
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 gradient-primary flex items-center justify-center">
          <div className="text-center text-white px-8">
            <div className="w-20 h-20 mx-auto mb-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold">S</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Synapse</h1>
            <p className="text-xl mb-8 opacity-90">
              당신의 지식을 연결하고 발견하세요
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm opacity-90">지능형 검색으로 빠른 정보 발견</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm opacity-90">지식 노드 간 연결로 통찰 확장</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm opacity-90">개인화된 지식 그래프 구축</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm opacity-90">실시간 협업과 지식 공유</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white bg-opacity-5 rounded-full"></div>
      </div>
    </div>
  );
};