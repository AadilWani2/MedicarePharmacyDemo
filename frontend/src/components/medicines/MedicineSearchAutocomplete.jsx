import { useState, useRef, useEffect } from 'react';
import { Search, Package, X, Pill, Hash, IndianRupee, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const MedicineSearchAutocomplete = ({ onSelect, placeholder = "Search medicine by name, generic name, or manufacturer...", hideOutOfStock = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchMedicines = async (searchQuery) => {
    if (searchQuery.length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get('/medicines/search', {
        params: { q: searchQuery, limit: 8 }
      });
      
      let searchResults = data.medicines || [];
      if (hideOutOfStock) {
        searchResults = searchResults.filter(m => m.quantity > 0);
      }
      
      setResults(searchResults);
      setShowResults(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchMedicines(value);
    }, 300);
  };

  const handleSelect = (medicine) => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    if (onSelect) onSelect(medicine);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Tablets': 'bg-blue-100 text-blue-700',
      'Capsules': 'bg-purple-100 text-purple-700',
      'Syrups': 'bg-green-100 text-green-700',
      'Injections': 'bg-red-100 text-red-700',
      'Ointments': 'bg-yellow-100 text-yellow-700',
      'Drops': 'bg-cyan-100 text-cyan-700',
      'Powders': 'bg-pink-100 text-pink-700',
      'Medical Equipment': 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getStockIndicator = (quantity) => {
    if (quantity === undefined || quantity === null) return null;
    if (quantity === 0) return { color: 'bg-red-500', text: 'Out of stock' };
    if (quantity <= 20) return { color: 'bg-yellow-500', text: `${quantity} left` };
    if (quantity <= 50) return { color: 'bg-orange-500', text: `${quantity} left` };
    return { color: 'bg-green-500', text: 'In stock' };
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="pl-10 pr-10 w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm py-2.5"
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Hint */}
      {query && query.length < 2 && (
        <p className="text-xs text-gray-400 mt-1 ml-1">Type at least 2 characters to search...</p>
      )}

      {/* Dropdown Results */}
      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              {loading ? 'Searching...' : `${results.length} medicine${results.length !== 1 ? 's' : ''} found`}
            </span>
            <button
              onClick={clearSearch}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Clear
            </button>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No medicines found</p>
              <p className="text-xs text-gray-400 mt-1">Try searching with a different name</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-72">
              {results.map((medicine, index) => {
                const stock = getStockIndicator(medicine.quantity);
                
                return (
                  <button
                    key={medicine._id}
                    onClick={() => handleSelect(medicine)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                      index === selectedIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Medicine Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5">
                        <Pill className="h-5 w-5 text-blue-600" />
                      </div>

                      {/* Medicine Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {medicine.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {medicine.genericName}
                            </p>
                          </div>
                          
                          {/* Stock Indicator */}
                          {stock && (
                            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                              <span className={`w-2 h-2 rounded-full ${stock.color}`}></span>
                              <span className="text-xs text-gray-500">{stock.text}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 mt-2">
                          {/* Category Badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(medicine.category)}`}>
                            {medicine.category}
                          </span>

                          {/* Manufacturer */}
                          <span className="text-xs text-gray-400 truncate">
                            {medicine.manufacturer}
                          </span>

                          {/* Price */}
                          {medicine.sellingPrice && (
                            <span className="flex items-center text-xs font-medium text-gray-700">
                              <IndianRupee className="h-3 w-3 mr-0.5" />
                              {medicine.sellingPrice}
                            </span>
                          )}

                          {/* Prescription Required */}
                          {medicine.requiresPrescription && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                              Rx
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Select Arrow */}
                      <CheckCircle 
                        className={`h-5 w-5 flex-shrink-0 mt-1 ${
                          index === selectedIndex ? 'text-blue-500' : 'text-transparent'
                        }`} 
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {results.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
              <span>Total: {results.length} results</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicineSearchAutocomplete;