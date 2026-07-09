import { useState, useCallback } from 'react'; import { v4 } from 'uuid';
import { calcDriveway } from '../lib/engine/module-a-driveway';
import { calcCulvert } from '../lib/engine/module-b-culvert';
import { calcSeptic } from '../lib/engine/module-c-septic';
import { calcBasement } from '../lib/engine/module-d-basements';
import { calcHauling, SOIL_FACTORS } from '../lib/engine/module-e-hauling';
type PT=''|'driveway'|'culvert'|'septic'|'basement'|'hauling';
export default function Calculator() {
  const[pt,setPt]=useState<PT>('');const[pn,setPn]=useState('');const[res,setRes]=useState<any>(null);
  const[sv,setSv]=useState(false);const[saved,setSaved]=useState(false);
  const[dwL,dwW,dwD,dwBL,dwBT,dwF,dwAC]=[useState(100),useState(12),useState(10),useState<1|2>(1),useState(6),useState(true),useState(35)];
  const[cvD,cvL,cvDe,cvW,cvS,cvH]=[useState(24),useState(60),useState(6),useState(5),useState(1),useState(true)];
  const[spB,spP,spTW,spTC]=[useState(3),useState(15),useState(3),useState(3)];
  const[bsL,bsW,bsD,bsT,bsC]=[useState(40),useState(30),useState(8),useState(false),useState(false)];
  const[hlBC,hlST,hlDist,hlTCap,hlTCnt]=[useState(500),useState('common-earth'),useState(5),useState(10),useState(2)];
  const calc=useCallback(()=>{if(!pt||!pn.trim())return;setSaved(false);
    try{let r:any;
      switch(pt){
        case'driveway':r=calcDriveway({lengthFt:dwL[0],widthFt:dwW[0],depthIn:dwD[0],baseLayers:dwBL[0],baseThicknessIn:dwBT[0],subBaseThicknessIn:4,needsFabric:dwF[0],fabricOverlapIn:6,slopePercent:2,soilSwellFactor:1.25,compactionFactor:1.15,baseAggregateCostPerCY:dwAC[0],subBaseAggregateCostPerCY:dwAC[0]*0.8,fabricCostPerSY:2.5,laborRatePerHr:65,equipmentRatePerHr:95,hoursPer1000SqFt:3.5});break;
        case'culvert':r=calcCulvert({pipeDiameterIn:cvD[0],lengthFt:cvL[0],trenchBottomWidthFt:cvW[0],trenchDepthFt:cvDe[0],sideSlopeRatio:cvS[0],beddingThicknessIn:6,coverThicknessIn:12,soilSwellFactor:1.25,compactionFactor:1.15,needsHeadwall:cvH[0],headwallHeightFt:4,headwallWidthFt:6,headwallThicknessIn:8,headwallCount:2,needsRiprap:true,riprapLengthFt:8,riprapWidthFt:6,riprapThicknessIn:12,beddingCostPerCY:45,backfillCostPerCY:25,concreteCostPerCY:180,riprapCostPerCY:55,pipeCostPerLF:45,laborRatePerHr:65,excavatorRatePerHr:95,hoursPerCY:0.08});break;
        case'septic':r=calcSeptic({bedrooms:spB[0],occupants:spB[0]*1.5,percRateMinPerIn:spP[0],trenchWidthFt:spTW[0],gravelDepthIn:18,gravelCoverOverPipeIn:2,pipeDiameterIn:4,trenchCount:spTC[0],trenchLengthOverrideFt:0,needsPumpChamber:false,elevationDifferenceFt:5,tankExcavationDepthFt:6,tankExcavationLengthFt:10,tankExcavationWidthFt:5,tankSideSlope:1,soilSwellFactor:1.25,tankCostPerGal:0.65,pipeCostPerLF:3.5,gravelCostPerCY:40,backfillCostPerCY:25,pumpChamberCost:2500,laborRatePerHr:65,excavatorRatePerHr:95,hoursPerCY:0.1});break;
        case'basement':r=calcBasement({lengthFt:bsL[0],widthFt:bsW[0],depthFt:bsD[0],benchCount:0,benchWidthFt:0,sideSlopeRatio:1,tightAccess:bsT[0],tightAccessMultiplier:1.35,needsClayLiner:bsC[0],clayLinerThicknessIn:12,needsDewatering:true,dewateringPercent:10,soilSwellFactor:1.25,compactionFactor:1.15,clayCostPerCY:30,importBackfillCostPerCY:25,laborRatePerHr:65,excavatorRatePerHr:95,dozerRatePerHr:110,hoursPer100CY:2.5});break;
        case'hauling':r=calcHauling({bankVolumeCY:hlBC[0],soilType:hlST[0] as any,swellFactorOverride:0,compactionFactorOverride:0,truckCapacityLCY:hlTCap[0],truckPayloadTons:hlTCap[0]*1.5,haulDistanceMiles:hlDist[0],avgSpeedLoadedMph:30,avgSpeedEmptyMph:40,loadTimeMinutes:5,dumpTimeMinutes:3,truckOpCostPerHr:45,driverWagePerHr:28,truckCount:hlTCnt[0],fuelCostPerGal:4.5,fuelConsumptionLoadedMPG:4,fuelConsumptionEmptyMPG:5.5,profitMarginPercent:15});break;
      }
      const tc=r.totalCost||r.costs?.total||r.costs?.totalHauling||0;
      setRes({totalCost:tc,lineItems:r.lineItems||[],detail:r,moduleType:pt});
    }catch(e:any){alert('Error: '+e.message)}
  },[pt,pn,dwL,dwW,dwD,dwBL,dwBT,dwF,dwAC,cvD,cvL,cvDe,cvW,cvS,cvH,spB,spP,spTW,spTC,bsL,bsW,bsD,bsT,bsC,hlBC,hlST,hlDist,hlTCap,hlTCnt]);
  const save=()=>{if(!res)return;setSv(true);const b=JSON.parse(localStorage.getItem('dirtbid_bids')||'[]');b.unshift({id:v4(),projectName:pn||'Untitled',projectType:pt,grandTotal:res.totalCost,createdAt:new Date().toISOString(),status:'draft'});localStorage.setItem('dirtbid_bids',JSON.stringify(b));setSaved(true);setTimeout(()=>setSaved(false),2000);setSv(false);};
  const topts=[{v:'driveway',l:'🚧 Driveway',d:'Access roads'},{v:'culvert',l:'🔧 Culvert',d:'Pipe & trench'},{v:'septic',l:'🧪 Septic',d:'Tanks & drainfield'},{v:'basement',l:'🏗️ Basement',d:'Mass earthwork'},{v:'hauling',l:'🚚 Hauling',d:'Trucking & soil'}];
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-amber-900">Bid Calculator</h1>
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div><label className="text-sm font-medium text-gray-700">Project Name</label><input type="text" value={pn} onChange={e=>setPn(e.target.value)} placeholder="e.g., Smith Driveway" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" /></div>
      <div><label className="text-sm font-medium text-gray-700 mb-2 block">Project Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">{topts.map(o=><button key={o.v} onClick={()=>{setPt(o.v as PT);setRes(null)}} className={`p-3 rounded-lg border text-center text-sm font-medium transition ${pt===o.v?'bg-amber-100 border-amber-400 text-amber-800':'bg-white border-gray-200 text-gray-600 hover:border-amber-300'}`}>
          <div className="text-xl">{o.l.split(' ')[0]}</div><div>{o.l.split(' ').slice(1).join(' ')}</div><div className="text-xs text-gray-400">{o.d}</div></button>)}</div></div></div>
    {pt&&<div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-amber-800">Dimensions & Parameters</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {pt==='driveway'&&<>{[['Length (ft)',dwL],['Width (ft)',dwW],['Depth (in)',dwD],['Base Thick (in)',dwBT],['Aggreg. Cost ($/CY)',dwAC]].map(([l,s]:any)=><div key={l}><label className="text-xs font-medium text-gray-600">{l}</label><input type="number" value={s[0]} onChange={e=>s[1](Number(e.target.value))} min={0} step="any" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" /></div>)}
        <Tog label="Fabric" val={dwF[0]} set={dwF[1]} /></>}
        {pt==='culvert'&&<>{[['Pipe Dia (in)',cvD],['Length (ft)',cvL],['Depth (ft)',cvDe],['Width (ft)',cvW],['Side Slope',cvS]].map(([l,s]:any)=><div key={l}><label className="text-xs font-medium text-gray-600">{l}</label><input type="number" value={s[0]} onChange={e=>s[1](Number(e.target.value))} min={0} step="any" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" /></div>)}
        <Tog label="Headwalls" val={cvH[0]} set={cvH[1]} /></>}
        {pt==='septic'&&<>{[['Bedrooms',spB],['Perc Rate',spP],['Trench Width (ft)',spTW],['Trench Count',spTC]].map(([l,s]:any)=><div key={l}><label className="text-xs font-medium text-gray-600">{l}</label><input type="number" value={s[0]} onChange={e=>s[1](Number(e.target.value))} min={0} step="any" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" /></div>)}</>}
        {pt==='basement'&&<>{[['Length (ft)',bsL],['Width (ft)',bsW],['Depth (ft)',bsD]].map(([l,s]:any)=><div key={l}><label className="text-xs font-medium text-gray-600">{l}</label><input type="number" value={s[0]} onChange={e=>s[1](Number(e.target.value))} min={0} step="any" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" /></div>)}
        <Tog label="Tight Access" val={bsT[0]} set={bsT[1]} /><Tog label="Clay Liner" val={bsC[0]} set={bsC[1]} /></>}
        {pt==='hauling'&&<>{[['Bank Vol (CY)',hlBC],['Dist (mi)',hlDist],['Cap (LCY)',hlTCap],['Trucks',hlTCnt]].map(([l,s]:any)=><div key={l}><label className="text-xs font-medium text-gray-600">{l}</label><input type="number" value={s[0]} onChange={e=>s[1](Number(e.target.value))} min={0} step="any" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" /></div>)}
        <div><label className="text-xs font-medium text-gray-600">Soil Type</label><select value={hlST[0]} onChange={e=>hlST[1](e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none">{Object.keys(SOIL_FACTORS).map(k=><option key={k} value={k}>{k.replace('-',' ')}</option>)}</select></div></>}
      </div>
      <button onClick={calc} className="bg-amber-700 text-white px-6 py-2.5 rounded-lg hover:bg-amber-800 font-medium transition w-full sm:w-auto">Calculate Bid</button>
    </div>}
    {res&&<div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-amber-800">Bid Summary — {pn}</h2>
        <div className="text-2xl font-bold text-amber-900">${res.totalCost.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
        <th className="px-3 py-2">Item</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
        <tbody className="divide-y">{res.lineItems.filter((li:any)=>li.amount>0).map((li:any,i:number)=><tr key={i} className="hover:bg-gray-50"><td className="px-3 py-1.5">{li.description}</td><td className="px-3 py-1.5">{typeof li.quantity==='number'?Number(li.quantity).toFixed(1):li.quantity}</td>
        <td className="px-3 py-1.5">{li.unit}</td><td className="px-3 py-1.5 text-right">{li.rate>0?`$${Number(li.rate).toFixed(2)}`:'-'}</td>
        <td className="px-3 py-1.5 text-right font-medium">${Number(li.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>)}
        </tbody><tfoot><tr className="bg-amber-50 font-bold"><td colSpan={4} className="px-3 py-2 text-right">Total</td>
        <td className="px-3 py-2 text-right text-amber-900">${res.totalCost.toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr></tfoot></table></div>
      <div className="flex gap-3"><button onClick={save} disabled={sv} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm transition">{sv?'Saving...':saved?'✅ Saved':'💾 Save'}</button>
      <button onClick={()=>window.print()} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium">🖨️ Print</button></div>
    </div>}
    {res?.detail?.swellFactorUsed&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
      <strong>Note:</strong> Swell: {res.detail.swellFactorUsed}. {res.detail.looseVolumeLCY?.toFixed(1)} LCY. Loads: {res.detail.truckLoads}.</div>}
  </div>;
}
function Tog({label,val,set}:{label:string;val:boolean;set:(v:boolean)=>void}){
  return <div className="flex items-center gap-3 pt-5">
    <button onClick={()=>set(!val)} className={`w-10 h-5 rounded-full transition relative ${val?'bg-amber-500':'bg-gray-300'}`}>
    <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition ${val?'left-5':'left-0.5'}`} /></button>
    <span className="text-sm text-gray-700">{label}</span></div>;
}
