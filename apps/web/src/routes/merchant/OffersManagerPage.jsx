import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { ChevronLeft, Gift, Plus, Trash2, Edit2, ShieldCheck, X } from 'lucide-react';

export default function OffersManagerPage() {
  const navigate = useNavigate();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsRequired, setPointsRequired] = useState(100);
  const [rewardType, setRewardType] = useState('discount_coupon'); // 'discount_coupon', 'free_item'
  const [rewardValue, setRewardValue] = useState('');
  const [validUntil, setValidUntil] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await api.merchant.getOffers();
      setOffers(res.data.offers || []);
    } catch (err) {
      console.error('Failed to load merchant offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setPointsRequired(100);
    setRewardType('discount_coupon');
    setRewardValue('');
    setValidUntil('');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (offer) => {
    setEditingId(offer.id);
    setTitle(offer.title);
    setDescription(offer.description || '');
    setPointsRequired(offer.points_required);
    setRewardType(offer.reward_type);
    setRewardValue(offer.reward_value || '');
    setValidUntil(offer.valid_until ? new Date(offer.valid_until).toISOString().split('T')[0] : '');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const offerData = {
      title,
      description,
      pointsRequired: parseInt(pointsRequired, 10),
      rewardType,
      rewardValue,
      validUntil: validUntil ? new Date(validUntil).toISOString() : null
    };

    try {
      if (editingId) {
        // Update Offer
        await api.merchant.updateOffer(editingId, offerData);
        setSuccess('Offer updated successfully!');
      } else {
        // Create Offer
        await api.merchant.createOffer(offerData);
        setSuccess('Offer created successfully!');
      }

      await fetchOffers();
      setTimeout(() => setShowModal(false), 1000);
    } catch (err) {
      setError(err.message || 'Failed to save offer.');
    }
  };

  const handleDelete = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      await api.merchant.deleteOffer(offerId);
      setOffers(offers.filter(o => o.id !== offerId));
    } catch (err) {
      console.error('Failed to delete offer:', err);
    }
  };

  return (
    <div className="mobile-viewport min-h-screen pb-6 flex flex-col justify-between">
      
      <div>
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/merchant/dashboard')}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-100">Manage Offers</h1>
          </div>
          
          <button
            onClick={handleOpenAdd}
            className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-premium"
            aria-label="Add Offer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading active offers...
            </div>
          ) : offers.length === 0 ? (
            <div className="p-12 text-center glass rounded-3xl border border-slate-800/40 text-slate-500 text-sm">
              No offers configured yet. Click "+" to create a discount coupon!
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => {
                const isCoupon = offer.reward_type === 'discount_coupon';
                const badgeBg = isCoupon 
                  ? 'bg-loy-orange/10 text-loy-orange' 
                  : 'bg-loy-blue/10 text-loy-blue';

                return (
                  <div key={offer.id} className="glass-card rounded-2xl p-4 border border-slate-850 flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${badgeBg}`}>
                          {isCoupon ? 'Discount Coupon' : 'Free Item'}
                        </span>
                        <span className="text-[10px] text-brand-light font-bold">
                          {offer.points_required} PTS
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-100 text-sm">{offer.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">{offer.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(offer)}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        aria-label="Edit Offer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(offer.id)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                        aria-label="Delete Offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CRUD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card rounded-3xl border border-slate-800 w-full max-w-[340px] p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {editingId ? 'Edit Offer' : 'Add New Offer'}
              </span>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Offer Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Hot Cappuccino"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  rows="2"
                  placeholder="Describe details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Reward Type</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="discount_coupon">Discount Coupon</option>
                    <option value="free_item">Free Item</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Points Cost</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={pointsRequired}
                    onChange={(e) => setPointsRequired(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Value (e.g. ₹ discount)</label>
                  <input
                    type="text"
                    placeholder="e.g. 50"
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Valid Until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand hover:bg-purple-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-premium transition-all"
              >
                {editingId ? 'Save Changes' : 'Create Offer'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
