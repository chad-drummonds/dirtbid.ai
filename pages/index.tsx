import { useEffect, useState } from 'react'; import Link from 'next/link'; import { v4 } from 'uuid';
export default function Index() {
  const [b,setB]=useState<any[]>([]); const [st,setSt]=useState({t:0,d:0,s:0});
  useEffect(()=>{const r=localStorage.getItem('dirtbid_bids');if(r){const l=JSON.parse(r);setB(l);setSt({t:l.length,d:l.filter((x:any)=>x.status==='draft').length,s:l.filter((x:any)=>x.status==='submitted').length})}},[]);
  const del=(id:string)=>{const u=b.filter(x=>x.id!==id);setB(u);localStorage.setItem('dirtbid_bids',JSON.stringify(u));setSt({t:u.length,d:u.filter(x=>x.status==='draft').length,s:u.filter(x=>x.status==='submitted').length})};
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-amber-900">Bid Dashboard</h1>
      <Link href="/calculator" className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 font-medium text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>New Bid</Link></div>
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-2xl font-bold text-amber-600">{st.t}</div><div className="text-sm text-gray-500">Total</div></div>
      <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-2xl font-bold text-yellow-600">{st.d}</div><div className="text-sm text-gray-500">Drafts</div></div>
      <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-2xl font-bold text-green-600">{st.s}</div><div className="text-sm text-gray-500">Submitted</div></div>
    </div>
    {b.length===0?<div className="bg-white rounded-xl border shadow-sm p-12 text-center"><svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h2 className="text-lg text-gray-400 mb-2">No bids yet</h2><p className="text-gray-400 mb-4">Create your first excavation estimate</p>
      <Link href="/calculator" className="bg-amber-700 text-white px-6 py-2 rounded-lg inline-block font-medium">Create Bid</Link></div>
    :<div className="bg-white rounded-xl border shadow-sm overflow-hidden"><table className="w-full text-sm">
      <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-3">Project</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
      <tbody className="divide-y">{b.map((x:any)=>(
        <tr key={x.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{x.projectName}</td><td className="px-4 py-3 text-gray-500 capitalize">{x.projectType}</td>
        <td className="px-4 py-3 font-semibold">${x.grandTotal?.toLocaleString()||'0'}</td><td className="px-4 py-3 text-gray-500">{new Date(x.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${x.status==='submitted'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{x.status}</span></td>
        <td className="px-4 py-3"><button onClick={()=>del(x.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button></td></tr>
      ))}</tbody></table></div>}
  </div>;
}
