/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IntegratedDashboardData, IntegratedDashboardAlert } from '../types';
import { getSantriList } from './santriService';
import { getTodayCategoryAttendanceStats } from './attendanceService';
import { getPermissions } from './permissionService';
import { getAllSpecialEventsSummary } from './specialEventService';

export async function getIntegratedDashboardData(): Promise<IntegratedDashboardData> {
  // Parallel fetch for high performance
  const [allSantri, categoryStats, allPermissions, specialSummary] = await Promise.all([
    getSantriList(),
    getTodayCategoryAttendanceStats(),
    getPermissions(),
    getAllSpecialEventsSummary(),
  ]);

  const totalSantri = allSantri.length;
  const santriAktif = allSantri.filter((s) => s.status_santri === 'Aktif').length;
  const santriIzin = allSantri.filter((s) => s.status_santri === 'Izin').length;
  const santriSakit = allSantri.filter((s) => s.status_santri === 'Sakit').length;
  const santriNonaktif = allSantri.filter((s) => s.status_santri === 'Nonaktif').length;
  const santriLulus = allSantri.filter((s) => s.status_santri === 'Lulus').length;

  // Process permissions stats
  let permMenunggu = 0;
  let permDisetujui = 0;
  let permSedangKeluar = 0;
  let permBelumKembali = 0;
  let permTerlambat = 0;
  const belumKembaliPermissions = allPermissions.filter((p) => {
    if (p.status === 'DIAJUKAN') permMenunggu++;
    if (p.status === 'DISETUJUI') permDisetujui++;
    if (p.status === 'SUDAH_KELUAR') permSedangKeluar++;
    if (p.status === 'TERLAMBAT') permTerlambat++;

    const isOut = ['SUDAH_KELUAR', 'TERLAMBAT'].includes(p.status) && !p.waktu_kembali;
    if (isOut) {
      permBelumKembali++;
      const now = new Date();
      const deadline = new Date(p.batas_kembali);
      if (now > deadline && p.status !== 'TERLAMBAT') {
        permTerlambat++;
      }
      return true;
    }
    return false;
  });

  // Construct Alerts ("PERLU PERHATIAN")
  const alerts: IntegratedDashboardAlert[] = [];

  // 1. Santri Belum Kembali dari Izin Keluar/Pulang
  if (permBelumKembali > 0) {
    alerts.push({
      id: 'alert-perm-belum-kembali',
      type: permTerlambat > 0 ? 'danger' : 'warning',
      title: `${permBelumKembali} Santri Belum Kembali (Izin)`,
      count: permBelumKembali,
      description: `${permTerlambat > 0 ? `${permTerlambat} santri telah melewati batas waktu kembali! ` : ''}Segera lakukan konfirmasi kontak wali / scan kedatangan.`,
      actionLabel: 'Periksa Perizinan',
      targetMenu: 'perizinan',
      filterPayload: { onlyBelumKembali: true },
    });
  }

  // 2. Peserta PSG / Kegiatan Khusus Belum Kembali
  if (specialSummary.psgBelumKembali > 0) {
    alerts.push({
      id: 'alert-psg-belum-kembali',
      type: 'warning',
      title: `${specialSummary.psgBelumKembali} Peserta PSG Belum Kembali`,
      count: specialSummary.psgBelumKembali,
      description: `Santri magang industri/PSG belum melakukan scan check-in kepulangan ke pondok.`,
      actionLabel: 'Lihat Presensi PSG',
      targetMenu: 'kegiatan_khusus',
    });
  } else if (specialSummary.belumKembali > 0) {
    alerts.push({
      id: 'alert-event-belum-kembali',
      type: 'warning',
      title: `${specialSummary.belumKembali} Peserta Kegiatan Khusus Belum Kembali`,
      count: specialSummary.belumKembali,
      description: `Peserta kegiatan luar pondok belum kembali ke asrama.`,
      actionLabel: 'Buka Kegiatan Khusus',
      targetMenu: 'kegiatan_khusus',
    });
  }

  // 3. Pengajuan Izin Menunggu Persetujuan
  if (permMenunggu > 0) {
    alerts.push({
      id: 'alert-perm-menunggu',
      type: 'warning',
      title: `${permMenunggu} Pengajuan Izin Menunggu`,
      count: permMenunggu,
      description: `Pengajuan izin santri membutuhkan verifikasi dan persetujuan pengurus asrama.`,
      actionLabel: 'Review Izin',
      targetMenu: 'perizinan',
      filterPayload: { status: 'DIAJUKAN' },
    });
  }

  // 4. Santri Belum Absensi Madin
  if (categoryStats.madin.belumAbsen > 0) {
    alerts.push({
      id: 'alert-absen-madin',
      type: 'info',
      title: `${categoryStats.madin.belumAbsen} Santri Belum Absensi Madin`,
      count: categoryStats.madin.belumAbsen,
      description: `Sesi kajian kitab Madrasah Diniyah belum tuntas direkap oleh petugas.`,
      actionLabel: 'Input Absen Madin',
      targetMenu: 'absensi',
      filterPayload: { kategori: 'Madin' },
    });
  }

  // 5. Santri Belum Absensi Sekolah
  if (categoryStats.sekolah.belumAbsen > 0) {
    alerts.push({
      id: 'alert-absen-sekolah',
      type: 'info',
      title: `${categoryStats.sekolah.belumAbsen} Santri Belum Absensi Sekolah`,
      count: categoryStats.sekolah.belumAbsen,
      description: `Kehadiran sekolah formal belum lengkap tercatat hari ini.`,
      actionLabel: 'Input Absen Sekolah',
      targetMenu: 'absensi',
      filterPayload: { kategori: 'Sekolah' },
    });
  }

  // 6. Santri Belum Absensi Jamaah
  if (categoryStats.jamaah.belumAbsen > 0) {
    alerts.push({
      id: 'alert-absen-jamaah',
      type: 'info',
      title: `${categoryStats.jamaah.belumAbsen} Santri Belum Absensi Jamaah`,
      count: categoryStats.jamaah.belumAbsen,
      description: `Presensi kedisiplinan shalat fardhu berjamaah di masjid utama.`,
      actionLabel: 'Input Absen Jamaah',
      targetMenu: 'absensi',
      filterPayload: { kategori: 'Jamaah' },
    });
  }

  return {
    totalSantri,
    santriAktif,
    santriIzin,
    santriSakit,
    santriNonaktif,
    santriLulus,
    sekolah: categoryStats.sekolah,
    madin: categoryStats.madin,
    jamaah: categoryStats.jamaah,
    perizinan: {
      menunggu: permMenunggu,
      disetujui: permDisetujui,
      sedangKeluar: permSedangKeluar,
      belumKembali: permBelumKembali,
      terlambat: permTerlambat,
      totalHariIni: allPermissions.length,
      belumKembaliList: belumKembaliPermissions,
    },
    kegiatanKhusus: {
      peserta: specialSummary.peserta,
      sudahBerangkat: specialSummary.sudahBerangkat,
      belumBerangkat: specialSummary.belumBerangkat,
      sudahKembali: specialSummary.sudahKembali,
      belumKembali: specialSummary.belumKembali,
      terlambat: specialSummary.terlambat,
      psgBelumKembali: specialSummary.psgBelumKembali,
      belumKembaliList: specialSummary.belumKembaliList,
    },
    alerts,
  };
}
