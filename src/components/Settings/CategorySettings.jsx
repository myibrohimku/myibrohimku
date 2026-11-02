import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Tag, Calendar, AlertCircle, RefreshCcw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import './CategorySettings.css';

export default function CategorySettings({ onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genMonths, setGenMonths] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  
  const [newCat, setNewCat] = useState({
    label: '',
    code: ''
  });

  const MONTHS_NAME = [
    { id: 1, name: 'Januari' }, { id: 2, name: 'Februari' }, { id: 3, name: 'Maret' },
    { id: 4, name: 'April' }, { id: 5, name: 'Mei' }, { id: 6, name: 'Juni' },
    { id: 7, name: 'Juli' }, { id: 8, name: 'Agustus' }, { id: 9, name: 'September' },
    { id: 10, name: 'Oktober' }, { id: 11, name: 'November' }, { id: 12, name: 'Desember' }
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ref_transak_bln')
        .select('*')
        .order('id_transak_bln');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Group by prefix for better visualization
  const groupedCategories = useMemo(() => {
    const groups = {};
    categories.forEach(cat => {
      const prefix = cat.id_transak_bln.replace(/\d+$/, '');
      if (!groups[prefix]) {
        groups[prefix] = {
          prefix,
          baseLabel: cat.label_transak_bln.replace(/\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)$/i, ''),
          count: 0
        };
      }
      groups[prefix].count++;
    });
    return Object.values(groups);
  }, [categories]);

  const toggleGenMonth = (id) => {
    setGenMonths(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.label || !newCat.code) return;
    if (genMonths.length === 0) {
      alert('Pilih minimal satu bulan!');
      return;
    }
    
    // Validate code (must be letters only, max 3-4 chars for neatness)
    const codeClean = newCat.code.toLowerCase().trim().replace(/[^a-z]/g, '');
    if (codeClean.length < 2) {
      alert('Kode minimal 2 huruf!');
      return;
    }

    setSaving(true);
    try {
      // Generate only selected months
      const records = MONTHS_NAME
        .filter(m => genMonths.includes(m.id))
        .map(m => ({
          id_transak_bln: `${codeClean}${m.id.toString().padStart(2, '0')}`,
          label_transak_bln: `${newCat.label} ${m.name}`
        }));

      const { error } = await supabase
        .from('ref_transak_bln')
        .insert(records);
      
      if (error) {
        if (error.code === '23505') throw new Error('Kode bulan tersebut sudah ada! Gunakan kode lain.');
        throw error;
      }

      setNewCat({ label: '', code: '' });
      setGenMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      setIsAdding(false);
      fetchCategories();
      alert(`Berhasil membuat kategori baru untuk ${records.length} bulan!`);
      
      // Auto-jump to nominal settings for the new category
      onSelectCategory?.(codeClean);
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (prefix) => {
    if (!confirm(`Hapus kategori "${prefix}"? Ini akan menghapus semua 12 bulan terkait di tabel referensi.`)) return;

    try {
      const { error } = await supabase
        .from('ref_transak_bln')
        .delete()
        .like('id_transak_bln', `${prefix}%`);
      
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="category-settings animate-fade-in">
      <div className="category-settings__header">
        <div>
          <h3 className="settings__section-title">Master Data: Kategori Iuran</h3>
          <p className="settings__hint">Kelola jenis iuran bulanan yang tersedia di sistem.</p>
        </div>
        <Button 
          variant={isAdding ? "ghost" : "primary"} 
          icon={isAdding ? null : Plus} 
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Batal' : 'Tambah Iuran Baru'}
        </Button>
      </div>

      {isAdding && (
        <div className="category-settings__form-card card animate-slide-down">
          <form onSubmit={handleAddCategory}>
            <div className="category-settings__form-grid">
              <Input 
                label="Nama Iuran (Base Label)" 
                placeholder="Contoh: Uang Makan"
                value={newCat.label}
                onChange={(e) => setNewCat({...newCat, label: e.target.value})}
                required
              />
              <Input 
                label="Kode Unik (2-3 Huruf)" 
                placeholder="Contoh: um"
                value={newCat.code}
                onChange={(e) => setNewCat({...newCat, code: e.target.value})}
                maxLength={4}
                required
              />
            </div>
            <div className="category-settings__month-selection">
              <label className="category-settings__label">Pilih Bulan yang Akan Dibuat:</label>
              <div className="category-settings__month-grid-small">
                {MONTHS_NAME.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`month-pill ${genMonths.includes(m.id) ? 'active' : ''}`}
                    onClick={() => toggleGenMonth(m.id)}
                  >
                    {m.name.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="category-settings__form-info">
              <Calendar size={14} />
              <span>Sistem akan membuat {genMonths.length} baris iuran menggunakan kode "{newCat.code || '...'}"</span>
            </div>
            <div className="category-settings__form-actions">
              <Button type="submit" disabled={saving || genMonths.length === 0}>
                {saving ? 'Memproses...' : `Generate ${genMonths.length} Bulan`}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="category-settings__list">
        {loading ? (
          <div className="category-settings__loading">
            <RefreshCcw className="spinner" />
            <span>Memuat data...</span>
          </div>
        ) : groupedCategories.length === 0 ? (
          <div className="category-settings__empty">
             <Tag size={40} />
             <p>Belum ada kategori iuran. Silakan tambah baru.</p>
          </div>
        ) : (
          <div className="category-settings__grid">
            {groupedCategories.map(group => (
              <div 
                key={group.prefix} 
                className="category-settings__item card clickable"
                onClick={() => onSelectCategory?.(group.prefix)}
                title="Klik untuk atur nominal"
              >
                <div className="category-settings__item-icon">
                  <Tag size={20} />
                </div>
                <div className="category-settings__item-info">
                  <span className="category-settings__item-name">{group.baseLabel}</span>
                  <div className="category-settings__item-meta">
                    <code>{group.prefix}01 - {group.prefix}12</code>
                    <Badge variant="secondary">{group.count} Bulan</Badge>
                  </div>
                </div>
                <button 
                  className="category-settings__item-delete"
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.prefix); }}
                  title="Hapus Kategori"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="category-settings__warning">
        <AlertCircle size={16} />
        <span>Menghapus kategori akan membuat data nominal terkait di tabel lain menjadi tidak valid. Lakukan dengan hati-hati.</span>
      </div>
    </div>
  );
}
