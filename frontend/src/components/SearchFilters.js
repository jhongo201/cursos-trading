import { useState, useEffect } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SearchFilters = ({ onSearch }) => {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, selectedCategory, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Categories fetch error:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory !== 'all') params.append('category_id', selectedCategory);
      params.append('sort', sortBy);

      const response = await axios.get(`${API}/courses/search?${params}`);
      onSearch(response.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8" data-testid="search-filters">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cursos..."
            className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            data-testid="search-input"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="category-filter">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="sort-filter">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectItem value="recent">Más recientes</SelectItem>
            <SelectItem value="popular">Más populares</SelectItem>
            <SelectItem value="rating">Mejor valorados</SelectItem>
            <SelectItem value="title">Orden alfabético</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};