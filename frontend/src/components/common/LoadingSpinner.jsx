const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`animate-spin rounded-full ${sizes[size]} border-3 border-blue-100 border-t-blue-600`} />
      {text && <p className="mt-4 text-sm text-gray-500">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;