/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RotateCw,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Kelas, Kamar } from '../types';
import {
  importSantriBatch,
  ImportSantriRow,
  ImportSantriResult,
} from '../services/santriService';
import { useAuth } from '../context/AuthContext';

interface ImportSantriModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kelasList: Kelas[];
  kamarList?: Kamar[];
  onKamarCreated?: () => Promise<void>;
}

interface ParsedSantriPreview extends ImportSantriRow {
  rowNumber: number;
  kelasName?: string;
  kamarName?: string;
  kelasMadin?: string;
  rawKamarOriginal?: string;
  isValid: boolean;
  errors: string[];
}

export const ImportSantriModal: React.FC<ImportSantriModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  kelasList,
  kamarList,
}) => {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSantriPreview[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportSantriResult | null>(null);

  if (!isOpen) return null;

  // Reset modal state
  const handleReset = () => {
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate and download template Excel (.xlsx) & CSV
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        'ID YYS (*)': 'YYS202600201',
        'Nama Lengkap (*)': 'Muhammad Ihsan Kamil',
        'NIS': 'NIS2026010',
        'Jenis Kelamin (L/P) (*)': 'L',
        'Kelas': kelasList[0]?.nama_kelas || 'Kelas 7-A MTs',
        'Kamar': 'Abu Bakar 1',
        'Kelas Madin': 'Ula 1',
        'Status (Aktif/Izin/Sakit)': 'Aktif',
        'Barcode': 'YYS202600201',
        'Nama Wali': 'H. Ahmad Subhan',
        'Kontak Wali': '081234567890',
        'Alamat': 'Jl. Gayungsari Barat No. 15, Surabaya',
      },
      {
        'ID YYS (*)': 'YYS202600202',
        'Nama Lengkap (*)': 'Nurul Hidayati',
        'NIS': 'NIS2026011',
        'Jenis Kelamin (L/P) (*)': 'P',
        'Kelas': kelasList[1]?.nama_kelas || 'Kelas 8-B MTs',
        'Kamar': 'Khadijah 2',
        'Kelas Madin': 'Wustho 1',
        'Status (Aktif/Izin/Sakit)': 'Aktif',
        'Barcode': 'YYS202600202',
        'Nama Wali': 'Drs. H. Mulyono',
        'Kontak Wali': '081398765432',
        'Alamat': 'Perum Pondok Mutiara Blok A-10, Sidoarjo',
      },
      {
        'ID YYS (*)': 'YYS202600203',
        'Nama Lengkap (*)': 'Ahmad Fauzi Ridwan',
        'NIS': 'NIS2026012',
        'Jenis Kelamin (L/P) (*)': 'L',
        'Kelas': kelasList[2]?.nama_kelas || 'Kelas 10-IPA MA',
        'Kamar': 'Utsman 1',
        'Kelas Madin': 'Ulya 1',
        'Status (Aktif/Izin/Sakit)': 'Aktif',
        'Barcode': 'YYS202600203',
        'Nama Wali': 'H. Mustofa Kamal',
        'Kontak Wali': '081233445566',
        'Alamat': 'Jl. Veteran No. 88, Gresik',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Santri');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'Template_Import_Santri.xlsx');
    } else {
      XLSX.writeFile(wb, 'Template_Import_Santri.csv', { bookType: 'csv' });
    }
  };

  // Parse Excel or CSV file
  const processFile = async (file: File) => {
    setParseError(null);
    setImportResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setParseError('Berkas kosong atau tidak memiliki lembar kerja (worksheet).');
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        setParseError('Tidak ada baris data yang ditemukan di dalam berkas.');
        return;
      }

      // Helper untuk menormalkan nomor telepon (termasuk notasi ilmiah Excel seperti 8.58E+10)
      const normalizePhone = (val: any): string => {
        if (val === null || val === undefined) return '';
        let str = String(val).trim();
        if (!str) return '';
        if (/^[0-9.]+[eE]\+?[0-9]+$/.test(str)) {
          try {
            const num = Number(str);
            if (!isNaN(num) && isFinite(num)) {
              str = BigInt(Math.round(num)).toString();
            }
          } catch {
            // keep original
          }
        }
        if (/^8[0-9]{8,13}$/.test(str)) {
          str = '0' + str;
        }
        return str;
      };

      // Map headers flexibly & prioritized sesuai kolom file CSV/Excel santri
      const previews: ParsedSantriPreview[] = rawRows.map((raw, idx) => {
        const rowNumber = idx + 2; // +1 for 0-index, +1 for header row in Excel
        const keys = Object.keys(raw);

        // Find value by checking potential header names with regex or exact matches
        const findColumn = (...patterns: (string | RegExp)[]): string => {
          for (const pattern of patterns) {
            for (const key of keys) {
              const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (typeof pattern === 'string') {
                const target = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (clean === target) return String(raw[key] ?? '').trim();
              } else if (pattern.test(clean)) {
                return String(raw[key] ?? '').trim();
              }
            }
          }
          return '';
        };

        const id_yys = findColumn(/^idyys/, /^noinduk/, /^id$/, /^nomorinduk/, /^yys/);
        // Pastikan nama santri tidak tertukar dengan nama wali
        const nama = findColumn(/^namalen/, /^namalengkap/, /^namasantri/, /^fullname/, /^(nama|santri)$/);
        const nis = findColumn(/^nis$/, /^nisn/);
        const rawJk = findColumn(/^jeniskela/, /^jeniskelamin/, /^jk$/, /^gender/, /^lp$/);
        const rawKelas = findColumn(/^kelas$/, /^namakelas/, /^tingkat/);
        const rawKamar = findColumn(/^kamar/, /^namakamar/, /^asrama/, /^kobong/, /^room/);
        const rawMadin = findColumn(/^rayon/, /^kelasmadin/, /^madin/, /^daerah/);
        const rawStatus = findColumn(/^statusak/, /^statussantri/, /^status/);
        const rawBarcode = findColumn(/^barcode/, /^barcodevalue/, /^kodebarcode/);
        const nama_wali = findColumn(/^namawal/, /^namawali/, /^wali$/, /^orangtua/);
        const rawKontakWali = findColumn(/^kontakw/, /^kontakwali/, /^nohpwali/, /^nohp/, /^telepon/);
        const kontak_wali = normalizePhone(rawKontakWali);
        const alamat = findColumn(/^alamat/, /^domisili/);

        // Determine gender
        let jk: 'L' | 'P' = 'L';
        const upperJk = rawJk.toUpperCase();
        if (upperJk === 'P' || upperJk === 'PEREMPUAN' || upperJk === 'WANITA' || upperJk === 'F') {
          jk = 'P';
        }

        // Match kelas by name
        let matchedKelasId: string | undefined = undefined;
        let matchedKelasName: string | undefined = undefined;
        if (rawKelas) {
          const foundKelas = kelasList.find(
            (k) =>
              k.nama_kelas.toLowerCase() === rawKelas.toLowerCase() ||
              k.nama_kelas.toLowerCase().includes(rawKelas.toLowerCase()) ||
              rawKelas.toLowerCase().includes(k.nama_kelas.toLowerCase())
          );
          if (foundKelas) {
            matchedKelasId = foundKelas.id;
            matchedKelasName = foundKelas.nama_kelas;
          }
        }

        // Kamar adalah kolom langsung di tabel santri - data kamar tampil sesuai data yang di import
        const cleanKamar = rawKamar ? rawKamar.trim() : undefined;
        const cleanMadin = rawMadin ? rawMadin.trim() : undefined;

        // Validation
        const errors: string[] = [];
        if (!id_yys) {
          errors.push('ID YYS kosong');
        }
        if (!nama) {
          errors.push('Nama santri kosong');
        }

        return {
          rowNumber,
          id_yys: id_yys.toUpperCase(),
          nama,
          nis: nis || undefined,
          jenis_kelamin: jk,
          kelas_id: matchedKelasId,
          kamar: cleanKamar,
          kamarName: cleanKamar,
          rawKamarOriginal: cleanKamar,
          kelas_madin: cleanMadin,
          kelasMadin: cleanMadin,
          rayon: cleanMadin,
          kelasName: matchedKelasName || rawKelas || undefined,
          status_santri: (['Aktif', 'Izin', 'Sakit', 'Nonaktif', 'Lulus'].includes(rawStatus)
            ? rawStatus
            : 'Aktif') as any,
          barcode_value: rawBarcode || id_yys.toUpperCase(),
          nama_wali: nama_wali || undefined,
          kontak_wali: kontak_wali || undefined,
          alamat: alamat || undefined,
          isValid: errors.length === 0,
          errors,
        };
      });

      setParsedRows(previews);
    } catch (err: any) {
      setParseError(`Gagal membaca berkas: ${err.message || 'Format tidak valid'}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Submit parsed rows to database
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      const payloads: ImportSantriRow[] = validRows.map((r) => ({
        id_yys: r.id_yys,
        nama: r.nama,
        nis: r.nis,
        jenis_kelamin: r.jenis_kelamin,
        kelas_id: r.kelas_id,
        kamar: r.kamarName || r.kamar || null,
        kamar_id: null,
        kelas_madin: r.kelasMadin || r.rayon || null,
        rayon: r.kelasMadin || r.rayon || null,
        status_santri: r.status_santri,
        barcode_value: r.barcode_value,
        nama_wali: r.nama_wali,
        kontak_wali: r.kontak_wali,
        alamat: r.alamat,
      }));

      const res = await importSantriBatch(payloads, profile?.email);
      setImportResult(res);
      if (res.successCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setParseError(err.message || 'Terjadi kesalahan saat memproses impor data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Import Data Santri (Excel & CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Unggah data santri massal dari spreadsheet Microsoft Excel (.xlsx/.xls) atau file .csv
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Download Template Banner */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-teal-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-teal-700" />
                <span>Format Template Impor Standar Pesantren</span>
              </span>
              <p className="text-teal-800 text-[11px]">
                Gunakan template standar agar nama kolom terbaca sempurna secara otomatis.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors flex items-center gap-1 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh .XLSX (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 font-semibold transition-colors flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-teal-700" />
                <span>Unduh .CSV</span>
              </button>
            </div>
          </div>

          {/* Upload Area */}
          {!fileName ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Pilih Berkas Excel atau CSV Santri
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tarik & letakkan berkas ke sini, atau klik untuk memilih dari komputer / smartphone
              </p>
              <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                <span>Mendukung .XLSX, .XLS, .CSV</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File & Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900">{fileName}</p>
                    <p className="text-[11px] text-slate-500">
                      Total: {parsedRows.length} baris |{' '}
                      <span className="text-emerald-700 font-bold">{validCount} siap diimpor</span>
                      {invalidCount > 0 && (
                        <span className="text-rose-600 font-bold"> | {invalidCount} data cacat</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Ganti Berkas</span>
                  </button>
                </div>
              </div>

              {/* Import Results if Done */}
              {importResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    importResult.failedCount === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      Proses Impor Selesai: {importResult.successCount} Santri Berhasil Disimpan!
                    </p>
                    {importResult.failedCount > 0 && (
                      <p className="text-rose-700">
                        {importResult.failedCount} data gagal disimpan. Silakan periksa daftar error di bawah.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Parsing / DB Error */}
              {parseError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Kendala Pemrosesan:</p>
                    <p className="mt-0.5">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Pratinjau Data Santri ({parsedRows.length} Data)
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Data Kamar dan Kelas Madin disimpan langsung sesuai data berkas impor
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">ID YYS</th>
                        <th className="py-2.5 px-3">Nama Santri</th>
                        <th className="py-2.5 px-3">L/P</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Kamar</th>
                        <th className="py-2.5 px-3">Kelas Madin</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50 transition-colors ${
                            !row.isValid ? 'bg-rose-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 font-mono">
                            {row.rowNumber}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {row.id_yys || <span className="text-rose-500 font-normal">Kosong</span>}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {row.nama || <span className="text-rose-500 font-normal">Kosong</span>}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                row.jenis_kelamin === 'L'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-pink-100 text-pink-800'
                              }`}
                            >
                              {row.jenis_kelamin}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {row.kelasName || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            {row.kamarName ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                                {row.kamarName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Tanpa Kamar</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {row.kelasMadin || row.rayon ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                                {row.kelasMadin || row.rayon}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-rose-600 font-semibold"
                                title={row.errors.join(', ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{row.errors[0]}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>

          {fileName && validCount > 0 && (
            <button
              type="button"
              disabled={isProcessing || validCount === 0}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Memproses {validCount} Santri...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Impor Sekarang ({validCount} Santri)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
