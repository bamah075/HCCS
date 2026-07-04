'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Container from '@mui/material/Container';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { clear_compliance_scan_qr, get_compliance_scans } from 'src/components/api/api';
import { useSettingsContext } from 'src/components/settings';

const TABLE_CODES = Array.from({ length: 11 }, (_, index) => String.fromCharCode(65 + index));

export default function ComplianceScanFmasView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const fetchComplianceScans = useCallback(async () => {
    const response = await get_compliance_scans();

    if (response.status) {
      setRows(Array.isArray(response.data) ? response.data : []);
      return;
    }

    setError(response.message || 'Failed to load compliance scan records.');
  }, []);

  useEffect(() => {
    fetchComplianceScans();
  }, [fetchComplianceScans]);

  const handleClearResults = async () => {
    if (!window.confirm('Clear all Compliance Scan FMAS qr values?')) {
      return;
    }

    setIsClearing(true);
    setError('');
    setSuccess('');

    const response = await clear_compliance_scan_qr();

    if (!response.status) {
      setError(response.message || 'Failed to clear compliance scan results.');
      setIsClearing(false);
      return;
    }

    const updatedCount = Number(response.data?.updated_count || 0);
    setSuccess(`Cleared qr for ${updatedCount} compliance scan record(s).`);
    await fetchComplianceScans();
    setIsClearing(false);
  };

  const counts = useMemo(() => {
    const initialCounts = TABLE_CODES.reduce((accumulator, code) => {
      accumulator[code] = 0;
      return accumulator;
    }, {});

    rows.forEach((row) => {
      const code = String(row?.qr || '').trim().toUpperCase();

      if (Object.hasOwn(initialCounts, code)) {
        initialCounts[code] += 1;
      }
    });

    return TABLE_CODES.map((code) => ({
      tableNumber: code,
      totalScans: initialCounts[code],
    }));
  }, [rows]);

  const totalQrScans = useMemo(
    () => counts.reduce((sum, row) => sum + row.totalScans, 0),
    [counts]
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Card>
        <CardHeader
          title="Compliance Scan FMAS"
          subheader={`FMAS event QR scans recorded: ${totalQrScans}`}
          action={
            <Button variant="contained" color="error" onClick={handleClearResults} disabled={isClearing}>
              {isClearing ? 'Clearing...' : 'Clear Results'}
            </Button>
          }
        />
        <CardContent>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

          {!error ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Each row shows the total number of compliance scan records where the qr field matches
                the table code from A to K.
              </Typography>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Table Number</TableCell>
                    <TableCell align="right">Total Compliance Scans</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {counts.map((row) => (
                    <TableRow key={row.tableNumber}>
                      <TableCell>{row.tableNumber}</TableCell>
                      <TableCell align="right">{row.totalScans}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}