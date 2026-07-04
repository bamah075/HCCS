import ComplianceScanDetailView from 'src/sections/compliance_scan/ComplianceScanDetailView';

export const metadata = { title: 'Dashboard: Compliance Scans' };

export default function Page({params}) {
    return <ComplianceScanDetailView id={params.id} />;
}
