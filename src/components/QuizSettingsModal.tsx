import React, { useState } from 'react';
import { XMarkIcon, Cog6ToothIcon, ClockIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface QuizSettings {
  totalQuestions: number;
  timePerQuestion: number;
  difficulties: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypes: string[];
}

interface QuizSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQuiz: (settings: QuizSettings) => void;
  selectedNodesCount: number;
}

export const QuizSettingsModal: React.FC<QuizSettingsModalProps> = ({
  isOpen,
  onClose,
  onStartQuiz,
  selectedNodesCount
}) => {
  const [settings, setSettings] = useState<QuizSettings>({
    totalQuestions: 10,
    timePerQuestion: 60,
    difficulties: {
      easy: 30,
      medium: 50,
      hard: 20
    },
    questionTypes: ['multiple_choice', 'true_false']
  });

  const questionCountOptions = [5, 10, 15, 20, 25, 30];
  const timeOptions = [30, 45, 60, 90, 120]; // seconds

  const handleDifficultyChange = (difficulty: string, value: number) => {
    const total = 100;
    const others = Object.entries(settings.difficulties)
      .filter(([key]) => key !== difficulty)
      .reduce((sum, [, val]) => sum + val, 0);

    if (value + others > total) {
      value = total - others;
    }

    setSettings(prev => ({
      ...prev,
      difficulties: {
        ...prev.difficulties,
        [difficulty]: Math.max(0, Math.min(100, value))
      }
    }));
  };

  const handleQuestionTypeToggle = (type: string) => {
    setSettings(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const handleStartQuiz = () => {
    if (settings.questionTypes.length === 0) {
      alert('최소 하나의 문제 유형을 선택해주세요.');
      return;
    }

    onStartQuiz(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Cog6ToothIcon className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">퀴즈 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 선택된 노드 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <AcademicCapIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                선택된 학습 자료: {selectedNodesCount}개
              </span>
            </div>
          </div>

          {/* 문제 개수 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              문제 개수
            </label>
            <div className="grid grid-cols-3 gap-2">
              {questionCountOptions.map(count => (
                <button
                  key={count}
                  onClick={() => setSettings(prev => ({ ...prev, totalQuestions: count }))}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${settings.totalQuestions === count
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {count}문제
                </button>
              ))}
            </div>
          </div>

          {/* 문제당 시간 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              문제당 시간 제한
            </label>
            <div className="grid grid-cols-5 gap-2">
              {timeOptions.map(time => (
                <button
                  key={time}
                  onClick={() => setSettings(prev => ({ ...prev, timePerQuestion: time }))}
                  className={`
                    px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${settings.timePerQuestion === time
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {time}초
                </button>
              ))}
            </div>
          </div>

          {/* 난이도 분배 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              난이도 분배 (%)
            </label>
            <div className="space-y-3">
              {Object.entries(settings.difficulties).map(([difficulty, value]) => (
                <div key={difficulty} className="flex items-center space-x-4">
                  <span className={`
                    w-16 text-sm font-medium
                    ${difficulty === 'easy' ? 'text-green-600' :
                      difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'}
                  `}>
                    {difficulty === 'easy' ? '쉬움' :
                     difficulty === 'medium' ? '보통' : '어려움'}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleDifficultyChange(difficulty, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-sm text-gray-600">{value}%</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              총합: {Object.values(settings.difficulties).reduce((a, b) => a + b, 0)}%
            </div>
          </div>

          {/* 문제 유형 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              문제 유형
            </label>
            <div className="space-y-2">
              {[
                { id: 'multiple_choice', label: '객관식 (4지선다)', description: '선택지 중 정답을 고르는 문제' },
                { id: 'true_false', label: '참/거짓', description: '참 또는 거짓을 판단하는 문제' }
              ].map(type => (
                <label key={type.id} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={settings.questionTypes.includes(type.id)}
                    onChange={() => handleQuestionTypeToggle(type.id)}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 예상 소요 시간 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">예상 소요 시간</h4>
            <div className="text-lg font-semibold text-purple-600">
              약 {Math.ceil((settings.totalQuestions * settings.timePerQuestion) / 60)}분
            </div>
            <div className="text-xs text-gray-500 mt-1">
              문제 {settings.totalQuestions}개 × {settings.timePerQuestion}초 = {settings.totalQuestions * settings.timePerQuestion}초
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleStartQuiz}
            disabled={settings.questionTypes.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            퀴즈 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};