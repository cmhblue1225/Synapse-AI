import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MagnifyingGlassIcon, BookOpenIcon, ShareIcon } from '@heroicons/react/24/outline';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6 md:justify-start md:space-x-10">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Synapse</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0 space-x-4">
            <Link
              to="/auth/login"
              className="whitespace-nowrap text-base font-medium text-gray-500 hover:text-gray-900"
            >
              로그인
            </Link>
            <Link
              to="/auth/register"
              className="whitespace-nowrap bg-primary-600 border border-transparent rounded-md py-2 px-4 text-base font-medium text-white hover:bg-primary-700"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
        <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
          지식을{' '}
          <span className="relative whitespace-nowrap text-primary-600">
            <svg
              aria-hidden="true"
              viewBox="0 0 418 42"
              className="absolute top-2/3 left-0 h-[0.58em] w-full fill-primary-300"
              preserveAspectRatio="none"
            >
              <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
            </svg>
            <span className="relative">연결하세요</span>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-gray-700">
          Synapse는 인공지능 기반의 지식 관리 시스템입니다. 
          당신의 아이디어, 노트, 문서들을 지능적으로 연결하여 
          새로운 통찰을 발견하세요.
        </p>
        <div className="mt-10 flex justify-center gap-x-6">
          <Link
            to="/auth/register"
            className="group inline-flex items-center justify-center rounded-full py-3 px-6 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-primary-600 active:bg-primary-800 active:text-primary-100"
          >
            무료로 시작하기
            <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/auth/login"
            className="group inline-flex ring-1 items-center justify-center rounded-full py-3 px-6 text-sm focus:outline-none ring-slate-200 text-slate-700 hover:text-slate-900 hover:ring-slate-300 active:bg-slate-100 active:text-slate-600 focus-visible:outline-primary-600 focus-visible:ring-slate-300"
          >
            로그인
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">더 스마트하게</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              지식 관리의 새로운 패러다임
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              기존의 단순한 노트 앱을 넘어서, AI가 당신의 지식을 연결하고 
              새로운 아이디어를 발견할 수 있도록 도와드립니다.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <MagnifyingGlassIcon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  지능형 검색
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    자연어 검색으로 원하는 정보를 즉시 찾아보세요. 
                    키워드뿐만 아니라 의미까지 이해하는 검색 엔진입니다.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <BookOpenIcon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  지식 그래프
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    아이디어들 사이의 연결고리를 시각화하고, 
                    예상치 못한 통찰을 발견하세요.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <ShareIcon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  협업 지원
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    팀원들과 지식을 공유하고 함께 아이디어를 발전시켜 나가세요. 
                    실시간 협업이 가능합니다.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              지금 시작해보세요
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-200">
              무료로 시작하여 당신만의 지식 네트워크를 구축해보세요. 
              복잡한 설정 없이 바로 사용할 수 있습니다.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/auth/register"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                무료로 시작하기
              </Link>
              <a href="#features" className="text-sm font-semibold leading-6 text-white">
                더 알아보기 <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};