import React from 'react';

interface PricingCardProps {
  planName: string;
  price: string;
  description: string;
  features: string[];
  isCurrentPlan: boolean;
  isPopular?: boolean;
  buttonText: string;
  onAction: () => void;
  isLoading?: boolean;
}

export default function PricingCard({
  planName,
  price,
  description,
  features,
  isCurrentPlan,
  isPopular,
  buttonText,
  onAction,
  isLoading
}: PricingCardProps): React.ReactElement {
  return (
    <div className={`relative flex flex-col p-6 sm:p-8 rounded-2xl border ${isPopular ? 'border-blue-500 shadow-blue-500/10 dark:shadow-blue-900/20 shadow-xl' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm'}`}>
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{planName}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      <div className="mb-6 flex items-baseline text-gray-900 dark:text-white">
        <span className="text-4xl font-extrabold tracking-tight">{price}</span>
        {price !== 'Free' && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">/month</span>}
      </div>

      <ul className="flex-1 space-y-4 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <svg className="h-5 w-5 text-green-500 shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onAction}
        disabled={isCurrentPlan || isLoading}
        className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 
          ${isCurrentPlan 
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
            : isPopular
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900'
          } flex items-center justify-center`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}
