/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { SpecialEvent, Santri, Kelas, Kamar } from '../types';
import { getSpecialEvents, deleteSpecialEvent } from '../services/specialEventService';
import { getSantriList, getKelasList, getKamarList } from '../services/santriService';
import { SpecialEventList } from './special-events/SpecialEventList';
import { SpecialEventDetailView } from './special-events/SpecialEventDetailView';
import { SpecialEventCreateModal } from './special-events/SpecialEventCreateModal';
import { Loader2 } from 'lucide-react';

export const KegiatanKhususView: React.FC = () => {
  const { currentRole } = useAuth();
  const canManage = ['SUPER_ADMIN', 'ADMIN', 'PENGURUS_ASRAMA'].includes(currentRole);

  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventFallback, setSelectedEventFallback] = useState<SpecialEvent | null>(null);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all events & master data
  const loadData = useCallback(async () => {
    try {
      const [eventsData, santriData, klsData, kmrData] = await Promise.all([
        getSpecialEvents(),
        getSantriList(),
        getKelasList(),
        getKamarList(),
      ]);
      setEvents(eventsData);
      setSantriList(santriData);
      setKelasList(klsData);
      setKamarList(kmrData);
    } catch (err) {
      console.error('Error loading kegiatan khusus data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected event resolved from events or fallback
  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId) || selectedEventFallback
    : null;

  // Delete event handler
  const handleDeleteEvent = async (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;
    if (!window.confirm(`Yakin ingin menghapus kegiatan khusus "${target.nama_kegiatan}" beserta seluruh data absensinya?`)) {
      return;
    }

    try {
      const res = await deleteSpecialEvent(id);
      if (res.success) {
        if (selectedEventId === id) {
          setSelectedEventId(null);
          setSelectedEventFallback(null);
        }
        await loadData();
      } else {
        alert(res.error || 'Gagal menghapus kegiatan');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleSelectEvent = (ev: SpecialEvent) => {
    setSelectedEventId(ev.id);
    setSelectedEventFallback(ev);
  };

  const handleBack = () => {
    setSelectedEventId(null);
    setSelectedEventFallback(null);
    loadData();
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-xs font-semibold text-slate-500">
          Memuat Modul Kegiatan Khusus & PSG...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {selectedEvent ? (
        <SpecialEventDetailView
          event={selectedEvent}
          onBack={handleBack}
          santriList={santriList}
          kelasList={kelasList}
          kamarList={kamarList}
          canManage={canManage}
        />
      ) : (
        <SpecialEventList
          events={events}
          onSelectEvent={handleSelectEvent}
          onOpenCreateModal={() => setShowCreateModal(true)}
          onDeleteEvent={handleDeleteEvent}
          canManage={canManage}
        />
      )}

      {/* Modal Buat Kegiatan Khusus */}
      <SpecialEventCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          loadData();
        }}
        santriList={santriList}
        kelasList={kelasList}
        kamarList={kamarList}
      />
    </div>
  );
};
