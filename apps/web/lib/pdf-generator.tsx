'use client';

import type { ContractDto, ParcelDto } from '@/lib/contracts-api';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#15803d',
    paddingBottom: 10,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d',
  },
  subtitle: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#0f172a',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
  },
  infoItem: {
    width: '48%',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
  },
  col1: { width: '24%' },
  col2: { width: '16%' },
  col3: { width: '24%' },
  col4: { width: '36%' },
  mapImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    borderRadius: 4,
    marginTop: 4,
  },
  qrSection: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 10,
  },
  qrImage: {
    width: 72,
    height: 72,
  },
});

export interface GenerateDossierPdfInput {
  dossierId: string;
  contract: ContractDto;
  parcels: ParcelDto[];
  presignedUrl: string;
  mapSnapshotDataUrl?: string | null;
}

function GreenDossierDocument({
  dossierId,
  contract,
  parcels,
  presignedUrl,
  qrDataUrl,
  mapSnapshotDataUrl,
}: GenerateDossierPdfInput & { qrDataUrl: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>OPENPADDY GREEN DOSSIER</Text>
            <Text style={styles.subtitle}>
              Ho so truy xuat nguon goc &amp; tuan thu canh tac ben vung
            </Text>
          </View>
          <Text>ID: {dossierId}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Thong tin hop dong</Text>
          <View style={styles.infoGrid}>
            <Text style={styles.infoItem}>Ma hop dong: {contract.id}</Text>
            <Text style={styles.infoItem}>Doanh nghiep: {contract.dn_id}</Text>
            <Text style={styles.infoItem}>Hop tac xa: {contract.htx_id}</Text>
            <Text style={styles.infoItem}>
              San luong: {(contract.volume_kg / 1000).toFixed(1)} tan
            </Text>
            <Text style={styles.infoItem}>
              Gia thu mua: {contract.price_per_kg} VND/kg
            </Text>
            <Text style={styles.infoItem}>
              Ngay xuat ho so: {new Date().toISOString().slice(0, 10)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. Bang ghi nhan tuan thu ({parcels.length} thua ruong)
          </Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Ma thua</Text>
            <Text style={styles.col2}>Dien tich</Text>
            <Text style={styles.col3}>So check-in</Text>
            <Text style={styles.col4}>Trang thai</Text>
          </View>
          {parcels.map((p) => (
            <View key={p.id} style={styles.tableRow}>
              <Text style={styles.col1}>{p.id}</Text>
              <Text style={styles.col2}>{p.area_ha} ha</Text>
              <Text style={styles.col3}>{p.records.length} ban ghi</Text>
              <Text style={styles.col4}>
                {p.compliant ? 'DAT CHUAN' : p.violations.join(', ')}
              </Text>
            </View>
          ))}
        </View>

        {mapSnapshotDataUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Ban do vung nguyen lieu</Text>
            <Image src={mapSnapshotDataUrl} style={styles.mapImage} />
          </View>
        )}

        <View style={styles.qrSection}>
          <Image src={qrDataUrl} style={styles.qrImage} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>
              Lien ket truy xuat nguon goc (het han sau 24 gio)
            </Text>
            <Text style={{ fontSize: 8, color: '#475569' }}>
              {presignedUrl.slice(0, 110)}...
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// FR-05: Client-side PDF generation (<5s for 10 parcels)
export async function generateGreenDossierPdf(
  input: GenerateDossierPdfInput,
): Promise<Blob> {
  const qrDataUrl = await QRCode.toDataURL(input.presignedUrl, {
    width: 180,
    margin: 1,
  });

  return pdf(
    <GreenDossierDocument {...input} qrDataUrl={qrDataUrl} />,
  ).toBlob();
}
