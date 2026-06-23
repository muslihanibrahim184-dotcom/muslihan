"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Search, Boxes, ShoppingCart, Users, Truck, Scissors, LayoutDashboard,
  AlertTriangle, TrendingUp, X, Receipt, Coins, ArrowUpRight, ArrowDownRight, ScrollText,
  CalendarClock, LogOut, Loader2, RefreshCw, DollarSign, Euro, Pencil, Check, Phone, MapPin, ShieldCheck, UserCog, KeyRound, ArrowRightLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as db from "@/lib/db";

const C = { paper:"#FAF8F3", surface:"#FFFFFF", ink:"#16161D", inkSoft:"#5C5B66", hair:"#E8E2D6",
  gelir:"#18794E", gelirBg:"#E7F2EC", gider:"#B42318", giderBg:"#FBEAE8", gold:"#9C7A2E", goldBg:"#F4ECD9" };
const N=(x)=>Number(x)||0;
const tl=(n)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(N(n));
const sayi=(n)=>new Intl.NumberFormat("tr-TR").format(N(n));
const d2=(n)=>Number(n).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const dov=(a,kur)=>(!kur||!a)?"":`$${d2(a/kur.usd)} · €${d2(a/kur.eur)}`;
const AYLAR=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const fTarih=(iso)=>{ if(!iso) return "—"; const d=new Date(iso+"T00:00:00"); return `${String(d.getDate()).padStart(2,"0")} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`; };
const parse=(s)=>parseFloat(String(s).replace(/\./g,"").replace(",",".")) || 0;
const TODAY=db.todayISO();
const TEDARIKCI_TURLERI=["Lastikçi","Kordoncu","Etiketçi","Jiletinci","Atölyeci","Baskıcı","İlikçi","Aksesuarcı","Nakliyeci"];
const ROL_AD={admin:"Yönetici",editor:"Editör",tedarik:"Tedarik"};

export default function App({ session }) {
  const [data,setData]=useState(null);
  const [rol,setRol]=useState(null);
  const [hata,setHata]=useState("");
  const [sekme,setSekme]=useState("ozet");
  const [busy,setBusy]=useState(false);
  const [kur,setKur]=useState({usd:46.44,eur:53.29});
  const [kurK,setKurK]=useState("varsayilan"); const [kurD,setKurD]=useState("yukleniyor"); const [kurZ,setKurZ]=useState("");

  const refresh=useCallback(async()=>{ try{ setData(await db.loadAll()); setHata(""); }catch(e){ setHata(e.message||"Veri yüklenemedi"); } },[]);
  useEffect(()=>{ (async()=>{ const r=await db.getMyRole(); setRol(r); setSekme(r==="tedarik"?"kumasci":"ozet"); })(); refresh(); },[refresh]);

  const kurCek=async()=>{ setKurD("yukleniyor");
    try{ const r=await fetch("https://open.er-api.com/v6/latest/USD"); const d=await r.json();
      if(!d||!d.rates||!d.rates.TRY||!d.rates.EUR) throw new Error();
      setKur({usd:d.rates.TRY,eur:d.rates.TRY/d.rates.EUR});
      setKurZ(new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})); setKurK("canli"); setKurD("ok");
    }catch(e){ setKurD("hata"); } };
  const kurElle=(usd,eur)=>{ setKur({usd,eur}); setKurK("elle"); };
  useEffect(()=>{ kurCek(); },[]);

  const busyRef=useRef(false);
  const run=async(fn)=>{ if(busyRef.current) return null; busyRef.current=true; setBusy(true);
    try{ const res=await fn(); await refresh(); return res; }
    catch(e){ const m=e.message||"İşlem başarısız"; alert(m); return null; }
    finally{ busyRef.current=false; setBusy(false); } };

  if(hata && !data) return <Merkez><p style={{color:C.gider}}>{hata}</p><p className="text-sm mt-2" style={{color:C.inkSoft}}>SQL şemasını çalıştırdığınızdan emin olun.</p></Merkez>;
  if(!data || !rol) return <Merkez><Loader2 className="animate-spin" color={C.ink}/></Merkez>;

  const { products, customers, suppliers, sales, collections, supplierMov, cash, cheques } = data;
  const canDelete = rol==="admin";
  const stokDeger=products.reduce((a,b)=>a+N(b.stok)*N(b.giris),0);
  const kritik=products.filter(u=>N(u.stok)<=N(u.min_stok)).length;
  const toplamSatis=sales.reduce((a,b)=>a+N(b.tutar),0);
  const toplamKar=sales.reduce((a,b)=>a+N(b.kar),0);
  const musteriAlacak=customers.filter(m=>N(m.bakiye)>0).reduce((a,b)=>a+N(b.bakiye),0);
  const kumasciBorc=suppliers.filter(t=>t.grup==="kumasci"&&N(t.bakiye)>0).reduce((a,b)=>a+N(b.bakiye),0);
  const tedarikciBorc=suppliers.filter(t=>t.grup!=="kumasci"&&N(t.bakiye)>0).reduce((a,b)=>a+N(b.bakiye),0);
  const kasaBakiye=cash.reduce((a,b)=>a+(b.tip==="giris"?N(b.amount):-N(b.amount)),0);
  const alinanCek=cheques.filter(c=>c.tip==="alinan"&&c.durum==="Portföyde").reduce((a,b)=>a+N(b.tutar),0);
  const verilenCek=cheques.filter(c=>c.tip==="verilen"&&c.durum==="Beklemede").reduce((a,b)=>a+N(b.tutar),0);

  const A={
    sale:async({urunId,adet,musteriId,odeme,birimFiyat})=>{ const urun=products.find(p=>p.id===urunId); if(!urun) return "Ürün seçin";
      if(adet<=0) return "Adet girin"; if(adet>N(urun.stok)) return `Stok yetersiz (mevcut ${N(urun.stok)})`;
      if(odeme==="veresiye"&&!musteriId) return "Veresiye için müşteri seçin";
      const musteri=customers.find(m=>m.id===musteriId)||null; await run(()=>db.recordSale({urun,adet,musteri,odeme,birimFiyat})); return null; },
    deleteSale:(s)=>run(()=>db.deleteSale(s,products,customers)),
    addProduct:(p)=>run(()=>db.addProduct(p)), updateProduct:(id,patch)=>run(()=>db.updateProduct(id,patch)), deleteProduct:(id)=>run(()=>db.deleteProduct(id)),
    addCustomer:(c)=>run(()=>db.addCustomer(c)), updateCustomer:(id,patch)=>run(()=>db.updateCustomer(id,patch)), deleteCustomer:(id)=>run(()=>db.deleteCustomer(id)),
    collect:(id,tutar)=>{ const m=customers.find(c=>c.id===id); if(!m||tutar<=0) return; return run(()=>db.collectFromCustomer(m,tutar)); },
    addSupplier:(s)=>run(()=>db.addSupplier(s)), updateSupplier:(id,patch)=>run(()=>db.updateSupplier(id,patch)), deleteSupplier:(id)=>run(()=>db.deleteSupplier(id)),
    purchase:(id,ac,tutar,odeme)=>{ const t=suppliers.find(s=>s.id===id); if(!t||tutar<=0) return; return run(()=>db.supplierPurchase(t,ac,tutar,odeme)); },
    pay:(id,tutar)=>{ const t=suppliers.find(s=>s.id===id); if(!t||tutar<=0) return; return run(()=>db.supplierPay(t,tutar)); },
    addCheque:(c)=>run(()=>db.addCheque(c)), deleteCheque:(id)=>run(()=>db.deleteCheque(id)), chequeStatus:(c,d)=>run(()=>db.setChequeStatus(c,d)),
  };

  const TUM=[
    {k:"ozet",l:"Genel Bakış",I:LayoutDashboard},
    {k:"satis",l:"Satış",I:ShoppingCart},
    {k:"urun",l:"Ürünler",I:Boxes},
    {k:"musteri",l:"Müşteriler",I:Users},
    {k:"kumasci",l:"Kumaşçılar",I:Truck},
    {k:"ted",l:"Tedarikçiler",I:Scissors},
    {k:"cek",l:"Çek / Senet",I:ScrollText},
  ];
  let SEKMELER = rol==="tedarik" ? TUM.filter(s=>s.k==="kumasci"||s.k==="ted"||s.k==="cek") : [...TUM];
  if(rol==="admin") SEKMELER=[...SEKMELER,{k:"kullanicilar",l:"Kullanıcılar",I:UserCog}];
  const aktif = SEKMELER.some(s=>s.k===sekme) ? sekme : SEKMELER[0].k;

  return (
    <div style={{background:C.paper,color:C.ink,minHeight:"100vh"}}>
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg" style={{background:C.ink}}><ShoppingCart size={20} color={C.paper}/></div>
            <div><h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{fontFamily:"Georgia, serif"}}>Muslihan Tekstil</h1>
              <p className="text-xs sm:text-sm" style={{color:C.inkSoft}}>Mağaza takip sistemi</p></div>
          </div>
          <div className="flex items-center gap-2">
            {busy && <Loader2 size={16} className="animate-spin" color={C.inkSoft}/>}
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{background:C.gelirBg,color:C.gelir}}><ShieldCheck size={12}/> {ROL_AD[rol]}</span>
            <span className="hidden sm:block text-sm max-w-[150px] truncate" style={{color:C.inkSoft}}>{session?.user?.email}</span>
            <button onClick={()=>supabase.auth.signOut()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium" style={{borderColor:C.hair,background:C.surface}}><LogOut size={15}/> Çıkış</button>
          </div>
        </header>

        <KurBar kur={kur} kaynak={kurK} durum={kurD} zaman={kurZ} onCek={kurCek} onElle={kurElle}/>

        <div className="flex gap-1.5 mb-6 border-b pb-3 overflow-x-auto" style={{borderColor:C.hair}}>
          {SEKMELER.map(({k,l,I})=>(
            <button key={k} onClick={()=>setSekme(k)} className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all"
              style={{background:aktif===k?C.ink:"transparent",color:aktif===k?"#fff":C.inkSoft,border:`1px solid ${aktif===k?C.ink:"transparent"}`}}>
              <I size={15}/> {l}{k==="urun"&&kritik>0&&<span className="ml-1 text-xs px-1.5 rounded-full" style={{background:C.giderBg,color:C.gider}}>{kritik}</span>}
            </button>
          ))}
        </div>

        {aktif==="ozet" && <Ozet {...{stokDeger,kritik,kasaBakiye,toplamSatis,toplamKar,musteriAlacak,kumasciBorc,tedarikciBorc,alinanCek,verilenCek,cheques,sales,products,kur}} git={setSekme}/>}
        {aktif==="satis" && <Satis {...{products,customers,sales,kur,A,canDelete}}/>}
        {aktif==="urun" && <Urunler {...{products,stokDeger,kur,A,canDelete}}/>}
        {aktif==="musteri" && <Musteriler {...{customers,sales,collections,musteriAlacak,kur,A,canDelete}}/>}
        {aktif==="kumasci" && <SupplierScreen grup="kumasci" toplam={kumasciBorc} kur={kur} {...{suppliers,supplierMov,A,canDelete}}/>}
        {aktif==="ted" && <SupplierScreen grup="tedarikci" toplam={tedarikciBorc} kur={kur} {...{suppliers,supplierMov,A,canDelete}}/>}
        {aktif==="cek" && <CekSenet {...{cheques,customers,suppliers,alinanCek,verilenCek,kur,A,canDelete}}/>}
        {aktif==="kullanicilar" && <Kullanicilar me={session?.user?.id}/>}
      </div>
    </div>
  );
}

// === GENEL BAKIŞ ============================================================
function Ozet({stokDeger,kritik,kasaBakiye,toplamSatis,toplamKar,musteriAlacak,kumasciBorc,tedarikciBorc,alinanCek,verilenCek,cheques,sales,products,kur,git}){
  const sonSatis=[...sales].sort((a,b)=>(a.tarih<b.tarih?1:-1)).slice(0,5);
  const kritikler=products.filter(u=>N(u.stok)<=N(u.min_stok));
  const yaklasan=[...cheques].filter(c=>c.durum==="Portföyde"||c.durum==="Beklemede").sort((a,b)=>a.vade.localeCompare(b.vade)).slice(0,5);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <KPI etiket="Toplam Satış" deger={tl(toplamSatis)} alt={`${sales.length} işlem`} icon={<ShoppingCart size={18} color={C.ink}/>} bg="#F1EEE6" onClick={()=>git("satis")}/>
        <KPI etiket="Toplam Kâr" deger={tl(toplamKar)} alt="giriş–satış farkı" renk={toplamKar>=0?C.gelir:C.gider} icon={<TrendingUp size={18} color={toplamKar>=0?C.gelir:C.gider}/>} bg={toplamKar>=0?C.gelirBg:C.giderBg} onClick={()=>git("satis")}/>
        <KPI etiket="Kasa" deger={tl(kasaBakiye)} dov={dov(kasaBakiye,kur)} alt="peşin nakit" renk={C.gold} icon={<Coins size={18} color={C.gold}/>} bg={C.goldBg}/>
        <KPI etiket="Müşteri Alacağı" deger={tl(musteriAlacak)} dov={dov(musteriAlacak,kur)} alt="tahsil edilecek" renk={C.gelir} icon={<ArrowUpRight size={18} color={C.gelir}/>} bg={C.gelirBg} onClick={()=>git("musteri")}/>
        <KPI etiket="Kumaşçı Borcu" deger={tl(kumasciBorc)} dov={dov(kumasciBorc,kur)} alt="ödenecek" renk={C.gider} icon={<Truck size={18} color={C.gider}/>} bg={C.giderBg} onClick={()=>git("kumasci")}/>
        <KPI etiket="Tedarikçi Borcu" deger={tl(tedarikciBorc)} dov={dov(tedarikciBorc,kur)} alt="ödenecek" renk={C.gider} icon={<ArrowDownRight size={18} color={C.gider}/>} bg={C.giderBg} onClick={()=>git("ted")}/>
        <KPI etiket="Stok Değeri" deger={tl(stokDeger)} alt={`${products.length} ürün · ${kritik} kritik`} icon={<Boxes size={18} color={C.gold}/>} bg={C.goldBg} onClick={()=>git("urun")}/>
        <KPI etiket="Alınan Çek" deger={tl(alinanCek)} dov={dov(alinanCek,kur)} alt="portföyde" renk={C.gelir} icon={<ScrollText size={18} color={C.gelir}/>} bg={C.gelirBg} onClick={()=>git("cek")}/>
        <KPI etiket="Verilen Çek" deger={tl(verilenCek)} dov={dov(verilenCek,kur)} alt="vadesi gelecek" renk={C.gider} icon={<ScrollText size={18} color={C.gider}/>} bg={C.giderBg} onClick={()=>git("cek")}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border overflow-hidden" style={{background:C.surface,borderColor:C.hair}}>
          <h3 className="text-sm font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{color:C.inkSoft}}>Son Satışlar</h3>
          <Tablo bare><thead><Tr head><Th>Tarih</Th><Th>Ürün</Th><Th r>Tutar</Th><Th r>Kâr</Th><Th>Ödeme</Th></Tr></thead><tbody>
            {sonSatis.map(s=>(<Tr key={s.id}>
              <Td><span className="tabular-nums" style={{color:C.inkSoft}}>{fTarih(s.tarih)}</span></Td>
              <Td><div className="font-medium">{s.urun_ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{sayi(s.adet)} adet · {s.musteri_ad}</div></Td>
              <Td r mono bold>{tl(s.tutar)}</Td><Td r mono style={{color:N(s.kar)>=0?C.gelir:C.gider}}>{tl(s.kar)}</Td>
              <Td><Rozet renk={s.odeme==="peşin"?C.gelir:C.gold} bg={s.odeme==="peşin"?C.gelirBg:C.goldBg}>{s.odeme}</Rozet></Td>
            </Tr>))}
            {sonSatis.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz satış yok.</span></Td></Tr>}
          </tbody></Tablo>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border p-5" style={{background:C.surface,borderColor:C.hair}}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4" style={{color:C.inkSoft}}><AlertTriangle size={14} color={C.gider}/> Kritik Stok</h3>
            {kritikler.length===0?<p className="text-sm" style={{color:C.inkSoft}}>Tüm ürünler yeterli.</p>:
              <div className="space-y-3">{kritikler.map(s=>(<div key={s.id} className="flex items-center justify-between">
                <div><div className="text-sm font-medium">{s.ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{s.kod}</div></div>
                <span className="text-sm font-semibold tabular-nums" style={{color:C.gider}}>{sayi(s.stok)} {s.birim}</span></div>))}</div>}
          </div>
          <div className="rounded-xl border p-5" style={{background:C.surface,borderColor:C.hair}}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4" style={{color:C.inkSoft}}><CalendarClock size={14} color={C.gold}/> Yaklaşan Vadeler</h3>
            {yaklasan.length===0?<p className="text-sm" style={{color:C.inkSoft}}>Bekleyen çek/senet yok.</p>:
              <div className="space-y-3">{yaklasan.map(c=>{const gecti=c.vade<TODAY; return(<div key={c.id} className="flex items-center justify-between">
                <div><div className="text-sm font-medium">{c.kisi}</div><div className="text-xs" style={{color:gecti?C.gider:C.inkSoft}}>{fTarih(c.vade)} · {c.tur}{gecti?" · vadesi geçti":""}</div></div>
                <span className="text-sm font-semibold tabular-nums" style={{color:c.tip==="alinan"?C.gelir:C.gider}}>{c.tip==="alinan"?"+":"−"}{tl(c.tutar)}</span></div>);})}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// === SATIŞ ==================================================================
function Satis({products,customers,sales,kur,A,canDelete}){
  const [f,setF]=useState({urunId:"",adet:"",fiyat:"",musteriId:"",odeme:"peşin"}); const [hata,setHata]=useState("");
  const [yeniAc,setYeniAc]=useState(false); const [yeniM,setYeniM]=useState({ad:"",telefon:"",adres:""});
  const toTr=(n)=>String(n).replace(".",",");
  const u=products.find(x=>x.id===f.urunId); const adet=parseInt(f.adet)||0;
  const birim=parse(f.fiyat)||N(u?.satis);
  const fiyatDegisti=u&&birim>0&&birim!==N(u.satis);
  const onizleme=u?{tutar:adet*birim,kar:adet*(birim-N(u.giris))}:null;
  const urunSec=(id)=>{ const p=products.find(x=>x.id===id); setF({...f,urunId:id,fiyat:p?toTr(p.satis):""}); };
  const yap=async()=>{ const r=await A.sale({urunId:f.urunId,adet,musteriId:f.musteriId||null,odeme:f.odeme,birimFiyat:birim}); if(r){setHata(r);return;} setHata(""); setF({urunId:"",adet:"",fiyat:"",musteriId:"",odeme:f.odeme}); };
  const yeniMusteri=async()=>{ if(!yeniM.ad.trim())return; const m=await A.addCustomer({ad:yeniM.ad.trim(),telefon:yeniM.telefon.trim(),adres:yeniM.adres.trim(),vergi_no:"",notu:"",bakiye:0}); if(m){ setF(s=>({...s,musteriId:m.id})); setYeniAc(false); setYeniM({ad:"",telefon:"",adres:""}); } };
  const liste=[...sales].sort((a,b)=>(a.tarih<b.tarih?1:-1));
  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.hair}}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4" style={{color:C.inkSoft}}><Receipt size={15}/> Yeni Satış</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2"><Lbl>Ürün</Lbl>
            <select value={f.urunId} onChange={e=>urunSec(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>
              <option value="">Ürün seçin...</option>{products.map(x=><option key={x.id} value={x.id} disabled={N(x.stok)<=0}>{x.ad} — {tl(x.satis)} (stok {sayi(x.stok)})</option>)}</select></div>
          <div><Lbl>Adet</Lbl><input value={f.adet} onChange={e=>setF({...f,adet:e.target.value})} inputMode="numeric" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Birim Fiyat ₺</Lbl><input value={f.fiyat} onChange={e=>setF({...f,fiyat:e.target.value})} inputMode="decimal" placeholder={u?toTr(u.satis):"0"} className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${fiyatDegisti?C.gold:C.hair}`,background:C.paper}}/></div>
          <div><div className="flex items-center justify-between"><Lbl>Müşteri</Lbl><button onClick={()=>setYeniAc(!yeniAc)} className="text-xs font-medium mb-1.5" style={{color:C.gelir}}>+ Yeni</button></div>
            <select value={f.musteriId} onChange={e=>setF({...f,musteriId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>
            <option value="">Peşin müşteri</option>{customers.map(m=><option key={m.id} value={m.id}>{m.ad}</option>)}</select></div>
          <div><Lbl>Ödeme</Lbl><div className="flex gap-1.5">{["peşin","veresiye"].map(o=>{const a=f.odeme===o;return(
            <button key={o} onClick={()=>setF({...f,odeme:o})} className="flex-1 rounded-lg py-2 text-sm font-medium capitalize" style={{background:a?C.ink:"transparent",color:a?"#fff":C.inkSoft,border:`1px solid ${a?C.ink:C.hair}`}}>{o}</button>);})}</div></div>
        </div>
        {yeniAc&&(<div className="mt-3 rounded-lg border p-3 flex flex-wrap items-end gap-3" style={{borderColor:C.hair,background:C.paper}}>
          <Inp label="Yeni müşteri adı" v={yeniM.ad} set={v=>setYeniM({...yeniM,ad:v})} cls="flex-1 min-w-[160px]"/>
          <Inp label="Telefon (ops.)" v={yeniM.telefon} set={v=>setYeniM({...yeniM,telefon:v})} cls="min-w-[140px]"/>
          <Inp label="Adres (ops.)" v={yeniM.adres} set={v=>setYeniM({...yeniM,adres:v})} cls="flex-1 min-w-[200px]"/>
          <button onClick={yeniMusteri} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.ink}}>Müşteri Ekle & Seç</button>
        </div>)}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-4">
            {onizleme&&adet>0&&<>
              <span className="text-sm" style={{color:C.inkSoft}}>Birim: <b style={{color:fiyatDegisti?C.gold:C.ink}}>{tl(birim)}</b>{fiyatDegisti&&<span className="text-xs" style={{color:C.inkSoft}}> (liste {tl(u.satis)})</span>}</span>
              <span className="text-sm" style={{color:C.inkSoft}}>Tutar: <b style={{color:C.ink}}>{tl(onizleme.tutar)}</b> <span className="text-xs tabular-nums">({dov(onizleme.tutar,kur)})</span></span>
              <span className="text-sm" style={{color:C.inkSoft}}>Kâr: <b style={{color:onizleme.kar>=0?C.gelir:C.gider}}>{tl(onizleme.kar)}</b></span></>}
            {hata&&<span className="text-sm font-medium" style={{color:C.gider}}>{hata}</span>}
          </div>
          <button onClick={yap} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{background:C.gelir}}><Plus size={16}/> Satışı Kaydet</button>
        </div>
      </div>
      <Tablo><thead><Tr head><Th>Tarih</Th><Th>Ürün / Müşteri</Th><Th r>Adet</Th><Th r>Tutar</Th><Th r>Kâr</Th><Th>Ödeme</Th><Th></Th></Tr></thead><tbody>
        {liste.map(s=>(<Tr key={s.id}>
          <Td><span className="tabular-nums" style={{color:C.inkSoft}}>{fTarih(s.tarih)}</span></Td>
          <Td><div className="font-medium">{s.urun_ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{s.musteri_ad}</div></Td>
          <Td r mono>{sayi(s.adet)}<div className="text-xs font-normal tabular-nums" style={{color:C.inkSoft}}>birim {tl(N(s.birim_fiyat)||(N(s.adet)?N(s.tutar)/N(s.adet):0))}</div></Td><Td r mono bold>{tl(s.tutar)}</Td><Td r mono style={{color:N(s.kar)>=0?C.gelir:C.gider}}>{tl(s.kar)}</Td>
          <Td><Rozet renk={s.odeme==="peşin"?C.gelir:C.gold} bg={s.odeme==="peşin"?C.gelirBg:C.goldBg}>{s.odeme}</Rozet></Td>
          <Td>{canDelete&&<SilBtn onClick={()=>A.deleteSale(s)}/>}</Td>
        </Tr>))}
        {liste.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz satış yok.</span></Td></Tr>}
      </tbody></Tablo>
    </div>
  );
}

// === ÜRÜNLER ================================================================
function Urunler({products,stokDeger,kur,A,canDelete}){
  const [ac,setAc]=useState(false);
  const bos={ad:"",kod:"",kategori:"",stok:"",birim:"adet",giris:"",satis:"",min:""};
  const [f,setF]=useState(bos); const [arama,setArama]=useState("");
  const [duz,setDuz]=useState(null); // düzenlenen ürün
  const [df,setDf]=useState(bos);
  const ekle=async()=>{ if(!f.ad.trim())return; await A.addProduct({ad:f.ad.trim(),kod:f.kod||"—",kategori:f.kategori||"Genel",stok:parse(f.stok),birim:f.birim,giris:parse(f.giris),satis:parse(f.satis),min_stok:parse(f.min)}); setF(bos); setAc(false); };
  const duzenleAc=(s)=>{ setDf({ad:s.ad,kod:s.kod==="—"?"":s.kod,kategori:s.kategori==="Genel"?"":s.kategori,stok:String(s.stok),birim:s.birim||"adet",giris:String(s.giris),satis:String(s.satis),min:String(s.min_stok)}); setDuz(s); };
  const duzenleKaydet=async()=>{ if(!df.ad.trim())return; await A.updateProduct(duz.id,{ad:df.ad.trim(),kod:df.kod||"—",kategori:df.kategori||"Genel",stok:parse(df.stok),birim:df.birim,giris:parse(df.giris),satis:parse(df.satis),min_stok:parse(df.min)}); setDuz(null); };
  const goster=products.filter(u=>(u.ad+u.kod+u.kategori).toLowerCase().includes(arama.toLowerCase()));
  const FormGrid=(ff,setFf)=>(
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Inp label="Ürün adı" v={ff.ad} set={v=>setFf({...ff,ad:v})} cls="col-span-2"/><Inp label="Kod" v={ff.kod} set={v=>setFf({...ff,kod:v})}/><Inp label="Kategori" v={ff.kategori} set={v=>setFf({...ff,kategori:v})}/>
      <Inp label="Stok" v={ff.stok} set={v=>setFf({...ff,stok:v})} num/>
      <div><Lbl>Birim</Lbl><select value={ff.birim} onChange={e=>setFf({...ff,birim:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>{["adet","top","mt","kg","paket"].map(b=><option key={b}>{b}</option>)}</select></div>
      <Inp label="Giriş ₺ (maliyet)" v={ff.giris} set={v=>setFf({...ff,giris:v})} num/><Inp label="Satış ₺" v={ff.satis} set={v=>setFf({...ff,satis:v})} num/><Inp label="Min. stok" v={ff.min} set={v=>setFf({...ff,min:v})} num/>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Ozetcik etiket="Toplam Stok Değeri (giriş)" deger={tl(stokDeger)} dov={dov(stokDeger,kur)}/>
        <button onClick={()=>setAc(!ac)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{background:C.ink}}><Plus size={16}/> Ürün Ekle</button>
      </div>
      {ac&&(<div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
        {FormGrid(f,setF)}
        <div className="flex justify-end mt-3"><button onClick={ekle} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button></div>
      </div>)}
      <div className="relative max-w-xs"><Search size={15} color={C.inkSoft} className="absolute left-3 top-1/2 -translate-y-1/2"/>
        <input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Ürün ara..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
      <Tablo><thead><Tr head><Th>Ürün</Th><Th>Kategori</Th><Th r>Stok</Th><Th r>Giriş</Th><Th r>Satış</Th><Th r>Birim Kâr</Th><Th r>Marj</Th><Th></Th></Tr></thead><tbody>
        {goster.map(s=>{const dusuk=N(s.stok)<=N(s.min_stok),kar=N(s.satis)-N(s.giris),marj=N(s.satis)?Math.round(kar/N(s.satis)*100):0; return(
          <Tr key={s.id}>
            <Td><div className="font-medium">{s.ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{s.kod}</div></Td>
            <Td><Rozet renk={C.gold} bg={C.goldBg}>{s.kategori}</Rozet></Td>
            <Td r><span className="tabular-nums font-semibold" style={{color:dusuk?C.gider:C.ink}}>{sayi(s.stok)} {s.birim}</span>{dusuk&&<div className="text-xs" style={{color:C.gider}}>kritik</div>}</Td>
            <Td r mono>{tl(s.giris)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(N(s.giris),kur)}</div></Td>
            <Td r mono>{tl(s.satis)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(N(s.satis),kur)}</div></Td>
            <Td r mono><div className="font-medium" style={{color:C.gelir}}>{tl(kar)}</div><div className="text-xs" style={{color:C.inkSoft}}>{dov(kar,kur)}</div></Td>
            <Td r mono style={{color:C.gelir}}>%{marj}</Td>
            <Td r><div className="flex items-center justify-end gap-1">
              <button onClick={()=>duzenleAc(s)} className="p-1.5 rounded" title="Düzenle"><Pencil size={15} color={C.inkSoft}/></button>
              {canDelete&&<SilBtn onClick={()=>A.deleteProduct(s.id)}/>}
            </div></Td>
          </Tr>);})}
        {goster.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Ürün yok.</span></Td></Tr>}
      </tbody></Tablo>

      {duz&&<Modal title="Ürünü Düzenle" onClose={()=>setDuz(null)}>
        {FormGrid(df,setDf)}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={()=>setDuz(null)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Vazgeç</button>
          <button onClick={duzenleKaydet} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button>
        </div>
      </Modal>}
    </div>
  );
}

// === MÜŞTERİLER =============================================================
function Musteriler({customers,sales,collections,musteriAlacak,kur,A,canDelete}){
  const [ac,setAc]=useState(false);
  const [ny,setNy]=useState({ad:"",telefon:"",adres:"",vergi_no:"",notu:"",acilis:""});
  const [th,setTh]=useState({musteriId:"",tutar:""}); const [detay,setDetay]=useState(null);
  const [bilgiDuzenle,setBilgiDuzenle]=useState(false); const [bf,setBf]=useState({telefon:"",adres:"",vergi_no:"",notu:""});
  const yeni=async()=>{ if(!ny.ad.trim())return; await A.addCustomer({ad:ny.ad.trim(),telefon:ny.telefon.trim(),adres:ny.adres.trim(),vergi_no:ny.vergi_no.trim(),notu:ny.notu.trim(),bakiye:parse(ny.acilis)}); setNy({ad:"",telefon:"",adres:"",vergi_no:"",notu:"",acilis:""}); setAc(false); };
  const acDetay=(m)=>{ setBilgiDuzenle(false); setDetay(m); };
  const bilgiAc=()=>{ setBf({telefon:detay.telefon||"",adres:detay.adres||"",vergi_no:detay.vergi_no||"",notu:detay.notu||""}); setBilgiDuzenle(true); };
  const bilgiKaydet=async()=>{ await A.updateCustomer(detay.id,bf); setDetay({...detay,...bf}); setBilgiDuzenle(false); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Ozetcik etiket="Toplam Müşteri Alacağı" deger={tl(musteriAlacak)} dov={dov(musteriAlacak,kur)} renk={C.gelir} alt="tahsil edilecek"/>
        <button onClick={()=>setAc(!ac)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{background:C.ink}}><Plus size={16}/> Müşteri Ekle</button>
      </div>
      {ac&&(<div className="rounded-xl border p-4 grid grid-cols-2 md:grid-cols-3 gap-3" style={{background:C.surface,borderColor:C.hair}}>
        <Inp label="Ad / Ünvan" v={ny.ad} set={v=>setNy({...ny,ad:v})} cls="col-span-2 md:col-span-1"/>
        <Inp label="Telefon" v={ny.telefon} set={v=>setNy({...ny,telefon:v})}/>
        <Inp label="Vergi / TC No (ops.)" v={ny.vergi_no} set={v=>setNy({...ny,vergi_no:v})}/>
        <Inp label="Adres" v={ny.adres} set={v=>setNy({...ny,adres:v})} cls="col-span-2"/>
        <Inp label="Not" v={ny.notu} set={v=>setNy({...ny,notu:v})}/>
        <div><Inp label="Açılış borcu ₺" v={ny.acilis} set={v=>setNy({...ny,acilis:v})} num/>
          {parse(ny.acilis)>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ {dov(parse(ny.acilis),kur)}</div>}</div>
        <div className="col-span-2 md:col-span-3 flex justify-end"><button onClick={yeni} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button></div>
      </div>)}
      <div className="rounded-xl border p-4 flex flex-wrap items-end gap-3" style={{background:C.surface,borderColor:C.hair}}>
        <div className="flex-1 min-w-[160px]"><Lbl>Tahsilat – Müşteri</Lbl><select value={th.musteriId} onChange={e=>setTh({...th,musteriId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>
          <option value="">Seçin...</option>{customers.filter(m=>N(m.bakiye)>0).map(m=><option key={m.id} value={m.id}>{m.ad} ({tl(m.bakiye)})</option>)}</select></div>
        <Inp label="Tutar ₺" v={th.tutar} set={v=>setTh({...th,tutar:v})} num cls="min-w-[120px]"/>
        <button onClick={async()=>{await A.collect(th.musteriId,parse(th.tutar)); setTh({musteriId:"",tutar:""});}} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Tahsil Et</button>
      </div>
      <Tablo><thead><Tr head><Th>Müşteri</Th><Th>Telefon</Th><Th r>Bakiye</Th><Th r>Durum</Th><Th r>Aldığı Mal</Th><Th></Th></Tr></thead><tbody>
        {[...customers].sort((a,b)=>N(b.bakiye)-N(a.bakiye)).map(m=>{const mallar=sales.filter(s=>s.musteri_id===m.id); return(
          <Tr key={m.id}>
            <Td><button onClick={()=>acDetay(m)} className="font-medium underline-offset-2 hover:underline text-left">{m.ad}</button>{m.adres&&<div className="text-xs" style={{color:C.inkSoft}}>{m.adres}</div>}</Td>
            <Td><span className="text-sm tabular-nums" style={{color:m.telefon?C.ink:C.inkSoft}}>{m.telefon||"—"}</span></Td>
            <Td r mono bold style={{color:N(m.bakiye)>0?C.gider:C.gelir}}>{tl(Math.abs(N(m.bakiye)))}{N(m.bakiye)!==0&&<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(Math.abs(N(m.bakiye)),kur)}</div>}</Td>
            <Td r><span className="text-xs font-medium" style={{color:N(m.bakiye)>0?C.gider:C.gelir}}>{N(m.bakiye)>0?"Borçlu":N(m.bakiye)<0?"Alacaklı":"Kapalı"}</span></Td>
            <Td r mono style={{color:C.inkSoft}}>{mallar.length} kalem</Td>
            <Td>{canDelete&&<SilBtn onClick={()=>A.deleteCustomer(m.id)}/>}</Td>
          </Tr>);})}
        {customers.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Müşteri yok.</span></Td></Tr>}
      </tbody></Tablo>

      {detay&&<Modal title={detay.ad} onClose={()=>setDetay(null)}>
        <div className="flex gap-4 mb-4">
          <Ozetcik etiket="Güncel Bakiye" deger={tl(Math.abs(N(detay.bakiye)))} dov={dov(Math.abs(N(detay.bakiye)),kur)} renk={N(detay.bakiye)>0?C.gider:C.gelir}/>
          <Ozetcik etiket="Durum" deger={N(detay.bakiye)>0?"Borçlu":N(detay.bakiye)<0?"Alacaklı":"Kapalı"}/>
        </div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{color:C.inkSoft}}>İletişim & Bilgiler</h4>
          {!bilgiDuzenle?<button onClick={bilgiAc} className="flex items-center gap-1 text-xs font-medium" style={{color:C.inkSoft}}><Pencil size={12}/> Düzenle</button>
            :<button onClick={bilgiKaydet} className="flex items-center gap-1 text-xs font-semibold" style={{color:C.gelir}}><Check size={13}/> Kaydet</button>}
        </div>
        {!bilgiDuzenle?(
          <div className="rounded-lg border p-3 space-y-2 mb-4" style={{borderColor:C.hair}}>
            <BilgiSatir icon={<Phone size={14} color={C.inkSoft}/>} deger={detay.telefon} link={detay.telefon?`tel:${(detay.telefon||"").replace(/\s/g,"")}`:null}/>
            <BilgiSatir icon={<MapPin size={14} color={C.inkSoft}/>} deger={detay.adres}/>
            <BilgiSatir icon={<ScrollText size={14} color={C.inkSoft}/>} deger={detay.vergi_no} on="Vergi/TC: "/>
            <BilgiSatir icon={<Pencil size={14} color={C.inkSoft}/>} deger={detay.notu}/>
          </div>
        ):(
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Inp label="Telefon" v={bf.telefon} set={v=>setBf({...bf,telefon:v})}/>
            <Inp label="Vergi / TC No" v={bf.vergi_no} set={v=>setBf({...bf,vergi_no:v})}/>
            <Inp label="Adres" v={bf.adres} set={v=>setBf({...bf,adres:v})} cls="col-span-2"/>
            <Inp label="Not" v={bf.notu} set={v=>setBf({...bf,notu:v})} cls="col-span-2"/>
          </div>
        )}
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:C.inkSoft}}>Aldığı Mallar</h4>
        <Tablo bare><tbody>{sales.filter(s=>s.musteri_id===detay.id).map(s=>{const bfiyat=N(s.birim_fiyat)||(N(s.adet)?N(s.tutar)/N(s.adet):0); return(<Tr key={s.id}>
          <Td><span className="text-xs tabular-nums" style={{color:C.inkSoft}}>{fTarih(s.tarih)}</span></Td>
          <Td><div>{s.urun_ad} <span style={{color:C.inkSoft}}>×{sayi(s.adet)}</span></div><div className="text-xs tabular-nums" style={{color:C.inkSoft}}>birim {tl(bfiyat)}</div></Td>
          <Td r mono bold>{tl(s.tutar)}</Td><Td><Rozet renk={s.odeme==="peşin"?C.gelir:C.gold} bg={s.odeme==="peşin"?C.gelirBg:C.goldBg}>{s.odeme}</Rozet></Td>
        </Tr>);})}{sales.filter(s=>s.musteri_id===detay.id).length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz mal alımı yok.</span></Td></Tr>}</tbody></Tablo>
        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{color:C.inkSoft}}>Tahsilatlar</h4>
        <Tablo bare><tbody>{collections.filter(t=>t.musteri_id===detay.id).map(t=>(<Tr key={t.id}>
          <Td><span className="text-xs tabular-nums" style={{color:C.inkSoft}}>{fTarih(t.tarih)}</span></Td><Td>Tahsilat</Td><Td r mono bold style={{color:C.gelir}}>{tl(t.tutar)}</Td>
        </Tr>))}{collections.filter(t=>t.musteri_id===detay.id).length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Tahsilat yok.</span></Td></Tr>}</tbody></Tablo>
      </Modal>}
    </div>
  );
}
function BilgiSatir({icon,deger,link,on=""}){
  if(!deger) return (<div className="flex items-center gap-2 text-sm" style={{color:C.inkSoft}}>{icon}<span>—</span></div>);
  return (<div className="flex items-center gap-2 text-sm" style={{color:C.ink}}>{icon}{link?<a href={link} className="underline-offset-2 hover:underline">{on}{deger}</a>:<span>{on}{deger}</span>}</div>);
}

// === KUMAŞÇI / TEDARİKÇİ ====================================================
function SupplierScreen({grup,toplam,kur,suppliers,supplierMov,A,canDelete}){
  const kumasci=grup==="kumasci"; const etiket=kumasci?"Kumaşçı":"Tedarikçi";
  const grupListe=suppliers.filter(t=>kumasci?t.grup==="kumasci":t.grup!=="kumasci");
  const [ac,setAc]=useState(false);
  const [ny,setNy]=useState({ad:"",tur:kumasci?"Kumaşçı":"Lastikçi",acilis:""});
  const [mg,setMg]=useState({tedId:"",is:"",adet:"",birim:"",tutar:"",odeme:"veresiye"}); const [od,setOd]=useState({tedId:"",tutar:""});
  const [detay,setDetay]=useState(null); const [filtre,setFiltre]=useState("hepsi");
  const [bilgiDuzenle,setBilgiDuzenle]=useState(false); const [bf,setBf]=useState({ad:"",tur:""});
  const bilgiAc=()=>{ setBf({ad:detay.ad,tur:detay.tur||""}); setBilgiDuzenle(true); };
  const bilgiKaydet=async()=>{ if(!bf.ad.trim())return; const patch=kumasci?{ad:bf.ad.trim()}:{ad:bf.ad.trim(),tur:bf.tur.trim()||"Diğer"}; await A.updateSupplier(detay.id,patch); setDetay({...detay,...patch}); setBilgiDuzenle(false); };
  const turOnerileri=Array.from(new Set([...TEDARIKCI_TURLERI, ...grupListe.map(s=>s.tur).filter(Boolean)]));
  const mevcutTurler=Array.from(new Set(grupListe.map(s=>s.tur||"Diğer")));
  const yeni=async()=>{ if(!ny.ad.trim())return; await A.addSupplier({ad:ny.ad.trim(),grup,tur:kumasci?"Kumaşçı":(ny.tur.trim()||"Diğer"),bakiye:parse(ny.acilis)}); setNy({ad:"",tur:ny.tur,acilis:""}); setAc(false); };
  const goster=[...grupListe].filter(t=>kumasci?true:(filtre==="hepsi"||(t.tur||"Diğer")===filtre)).sort((a,b)=>N(b.bakiye)-N(a.bakiye));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Ozetcik etiket={`Toplam ${etiket} Borcu`} deger={tl(toplam)} dov={dov(toplam,kur)} renk={C.gider} alt="ödenecek"/>
        <button onClick={()=>setAc(!ac)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{background:C.ink}}><Plus size={16}/> {etiket} Ekle</button>
      </div>
      {ac&&(<div className="rounded-xl border p-4 flex flex-wrap items-end gap-3" style={{background:C.surface,borderColor:C.hair}}>
        <Inp label="Ünvan" v={ny.ad} set={v=>setNy({...ny,ad:v})} cls="flex-1 min-w-[160px]"/>
        {!kumasci&&<div className="min-w-[150px]"><Lbl>Tür (yazabilir/seçebilirsin)</Lbl>
          <input list="ted-tur-list" value={ny.tur} onChange={e=>setNy({...ny,tur:e.target.value})} placeholder="ör. Lastikçi" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
          <datalist id="ted-tur-list">{turOnerileri.map(t=><option key={t} value={t}/>)}</datalist></div>}
        <Inp label="Açılış borcu ₺" v={ny.acilis} set={v=>setNy({...ny,acilis:v})} num cls="min-w-[130px]"/>
        <button onClick={yeni} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button>
      </div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:C.inkSoft}}>Mal Girişi (alım)</h3>
          {(()=>{
            const adetN=parse(mg.adet), birimN=parse(mg.birim);
            const otoTutar=(adetN>0&&birimN>0)?adetN*birimN:0;
            const efTutar=otoTutar>0?otoTutar:parse(mg.tutar);
            const acikla=()=>{ let s=mg.is.trim()||"Mal girişi"; if(adetN>0&&birimN>0) s+=` · ${sayi(adetN)} adet × ${tl(birimN)}`; else if(adetN>0) s+=` · ${sayi(adetN)} adet`; return s; };
            const kaydet=async()=>{ if(!mg.tedId||efTutar<=0) return; await A.purchase(mg.tedId,acikla(),efTutar,mg.odeme); setMg({tedId:"",is:"",adet:"",birim:"",tutar:"",odeme:mg.odeme}); };
            return (<>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Lbl>{etiket}</Lbl><select value={mg.tedId} onChange={e=>setMg({...mg,tedId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="">Seçin...</option>{grupListe.map(t=><option key={t.id} value={t.id}>{t.ad}{kumasci?"":` · ${t.tur||"Diğer"}`}</option>)}</select></div>
                <div className="col-span-2"><Lbl>İş / Ürün (ne için?)</Lbl><input value={mg.is} onChange={e=>setMg({...mg,is:e.target.value})} placeholder="ör. Tişört dikimi, kumaş baskı, fason dikim" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
                <Inp label="Adet (ops.)" v={mg.adet} set={v=>setMg({...mg,adet:v})} num/>
                <Inp label="Birim ₺ (ops.)" v={mg.birim} set={v=>setMg({...mg,birim:v})} num/>
                <div>
                  <Lbl>{otoTutar>0?"Tutar ₺ (otomatik)":"Tutar ₺"}</Lbl>
                  {otoTutar>0
                    ? <div className="w-full rounded-lg px-3 py-2 text-sm tabular-nums font-semibold" style={{border:`1px solid ${C.hair}`,background:C.paper,color:C.ink}}>{tl(otoTutar)}</div>
                    : <input value={mg.tutar} onChange={e=>setMg({...mg,tutar:e.target.value})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>}
                  {efTutar>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ {dov(efTutar,kur)}</div>}
                </div>
                <div><Lbl>Ödeme</Lbl><select value={mg.odeme} onChange={e=>setMg({...mg,odeme:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="veresiye">Veresiye</option><option value="peşin">Peşin</option></select></div>
              </div>
              {(mg.is.trim()||adetN>0)&&<div className="mt-2 text-xs rounded-lg px-3 py-2" style={{background:C.paper,color:C.inkSoft}}>Kayda geçecek: <b style={{color:C.ink}}>{acikla()}</b></div>}
              <button onClick={kaydet} disabled={!mg.tedId||efTutar<=0} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50" style={{background:C.ink}}>Mal Girişi Kaydet</button>
            </>);
          })()}
        </div>
        <div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:C.inkSoft}}>Borç Ödeme</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Lbl>{etiket}</Lbl><select value={od.tedId} onChange={e=>setOd({...od,tedId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="">Seçin...</option>{grupListe.filter(t=>N(t.bakiye)>0).map(t=><option key={t.id} value={t.id}>{t.ad} ({tl(t.bakiye)})</option>)}</select></div>
            <Inp label="Tutar ₺" v={od.tutar} set={v=>setOd({...od,tutar:v})} num cls="col-span-2"/>
          </div>
          <button onClick={async()=>{await A.pay(od.tedId,parse(od.tutar)); setOd({tedId:"",tutar:""});}} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Ödeme Yap</button>
        </div>
      </div>
      {!kumasci&&<div className="flex gap-1.5 flex-wrap">
        <button onClick={()=>setFiltre("hepsi")} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{background:filtre==="hepsi"?C.ink:"transparent",color:filtre==="hepsi"?"#fff":C.inkSoft,border:`1px solid ${filtre==="hepsi"?C.ink:C.hair}`}}>Hepsi</button>
        {mevcutTurler.map(t=>(<button key={t} onClick={()=>setFiltre(t)} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{background:filtre===t?C.ink:"transparent",color:filtre===t?"#fff":C.inkSoft,border:`1px solid ${filtre===t?C.ink:C.hair}`}}>{t}</button>))}
      </div>}
      <Tablo><thead><Tr head><Th>{etiket}</Th>{!kumasci&&<Th>Tür</Th>}<Th r>Borç (Verecek)</Th><Th r>Durum</Th><Th r>Hareket</Th><Th></Th></Tr></thead><tbody>
        {goster.map(t=>{const h=supplierMov.filter(x=>x.supplier_id===t.id); return(
          <Tr key={t.id}>
            <Td><button onClick={()=>{setBilgiDuzenle(false); setDetay(t);}} className="font-medium underline-offset-2 hover:underline text-left">{t.ad}</button></Td>
            {!kumasci&&<Td><Rozet renk={C.gold} bg={C.goldBg}>{t.tur||"Diğer"}</Rozet></Td>}
            <Td r mono bold style={{color:N(t.bakiye)>0?C.gider:C.inkSoft}}>{tl(Math.abs(N(t.bakiye)))}{N(t.bakiye)!==0&&<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(Math.abs(N(t.bakiye)),kur)}</div>}</Td>
            <Td r><span className="text-xs font-medium" style={{color:N(t.bakiye)>0?C.gider:C.gelir}}>{N(t.bakiye)>0?"Borçlusun":"Kapalı"}</span></Td>
            <Td r mono style={{color:C.inkSoft}}>{h.length} kayıt</Td>
            <Td>{canDelete&&<SilBtn onClick={()=>A.deleteSupplier(t.id)}/>}</Td>
          </Tr>);})}
        {goster.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>{etiket} yok.</span></Td></Tr>}
      </tbody></Tablo>

      {detay&&<Modal title={detay.ad} onClose={()=>setDetay(null)}>
        <div className="flex gap-4 mb-1">
          <Ozetcik etiket="Güncel Borç" deger={tl(Math.abs(N(detay.bakiye)))} dov={dov(Math.abs(N(detay.bakiye)),kur)} renk={N(detay.bakiye)>0?C.gider:C.gelir}/>
          {!kumasci&&<Ozetcik etiket="Tür" deger={detay.tur||"Diğer"}/>}
        </div>
        <div className="flex items-center justify-between mt-4 mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{color:C.inkSoft}}>Bilgiler</h4>
          {!bilgiDuzenle
            ? <button onClick={bilgiAc} className="flex items-center gap-1 text-xs font-medium" style={{color:C.inkSoft}}><Pencil size={12}/> Düzenle</button>
            : <button onClick={bilgiKaydet} className="flex items-center gap-1 text-xs font-semibold" style={{color:C.gelir}}><Check size={13}/> Kaydet</button>}
        </div>
        {bilgiDuzenle&&(<div className="grid grid-cols-2 gap-3 mb-2 rounded-lg border p-3" style={{borderColor:C.hair}}>
          <Inp label="Ünvan / Ad" v={bf.ad} set={v=>setBf({...bf,ad:v})} cls={kumasci?"col-span-2":""}/>
          {!kumasci&&<div><Lbl>Tür</Lbl>
            <input list="ted-tur-edit" value={bf.tur} onChange={e=>setBf({...bf,tur:e.target.value})} placeholder="ör. Lastikçi" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
            <datalist id="ted-tur-edit">{turOnerileri.map(t=><option key={t} value={t}/>)}</datalist></div>}
        </div>)}
        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{color:C.inkSoft}}>Hareketler</h4>
        <Tablo bare><tbody>{[...supplierMov.filter(h=>h.supplier_id===detay.id)].sort((a,b)=>(a.tarih<b.tarih?1:-1)).map(h=>(<Tr key={h.id}>
          <Td><span className="text-xs tabular-nums" style={{color:C.inkSoft}}>{fTarih(h.tarih)}</span></Td><Td>{h.aciklama}</Td>
          <Td r mono bold style={{color:h.tip==="ödeme"?C.gelir:C.gider}}>{h.tip==="ödeme"?"−":"+"}{tl(h.tutar)}</Td>
          <Td><Rozet renk={h.tip==="ödeme"?C.gelir:h.tip==="peşin"?C.gold:C.gider} bg={h.tip==="ödeme"?C.gelirBg:h.tip==="peşin"?C.goldBg:C.giderBg}>{h.tip}</Rozet></Td>
        </Tr>))}{supplierMov.filter(h=>h.supplier_id===detay.id).length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Hareket yok.</span></Td></Tr>}</tbody></Tablo>
      </Modal>}
    </div>
  );
}

// === ÇEK / SENET ============================================================
function CekSenet({cheques,customers,suppliers,alinanCek,verilenCek,kur,A,canDelete}){
  const [ac,setAc]=useState(false);
  const [f,setF]=useState({tip:"alinan",tur:"Çek",kisi:"",banka:"",tutar:"",vade:TODAY,notu:""}); const [filtre,setFiltre]=useState("hepsi");
  const DURUMLAR={alinan:["Portföyde","Tahsil Edildi","Ciro Edildi","Karşılıksız"],verilen:["Beklemede","Ödendi","Karşılıksız"]};
  const dR=(d)=>({"Portföyde":C.gold,"Beklemede":C.gold,"Tahsil Edildi":C.gelir,"Ödendi":C.gelir,"Ciro Edildi":C.inkSoft,"Karşılıksız":C.gider}[d]||C.inkSoft);
  const dB=(d)=>({"Portföyde":C.goldBg,"Beklemede":C.goldBg,"Tahsil Edildi":C.gelirBg,"Ödendi":C.gelirBg,"Ciro Edildi":C.hair,"Karşılıksız":C.giderBg}[d]||C.hair);
  const kisiler=f.tip==="alinan"?customers:suppliers;
  const ekle=async()=>{ if(!f.kisi.trim()||parse(f.tutar)<=0)return; await A.addCheque({tip:f.tip,tur:f.tur,kisi:f.kisi.trim(),banka:f.banka||"—",tutar:parse(f.tutar),vade:f.vade,durum:f.tip==="alinan"?"Portföyde":"Beklemede",notu:f.notu,islendi:false}); setF({tip:f.tip,tur:"Çek",kisi:"",banka:"",tutar:"",vade:TODAY,notu:""}); setAc(false); };
  const goster=[...cheques].filter(c=>filtre==="hepsi"||c.tip===filtre).sort((a,b)=>a.vade.localeCompare(b.vade));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Ozetcik etiket="Alınan Çek (portföyde)" deger={tl(alinanCek)} dov={dov(alinanCek,kur)} renk={C.gelir} alt="tahsil edilecek"/>
          <Ozetcik etiket="Verilen Çek (bekleyen)" deger={tl(verilenCek)} dov={dov(verilenCek,kur)} renk={C.gider} alt="ödenecek"/>
        </div>
        <button onClick={()=>setAc(!ac)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{background:C.ink}}><Plus size={16}/> Çek / Senet Ekle</button>
      </div>
      {ac&&(<div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
        <div className="flex flex-wrap gap-2 mb-3">{[["alinan","Alınan (bana verilen)"],["verilen","Verilen (benim yazdığım)"]].map(([k,l])=>{const a=f.tip===k;return(
          <button key={k} onClick={()=>setF({...f,tip:k,kisi:""})} className="rounded-lg px-4 py-2 text-sm font-medium" style={{background:a?C.ink:"transparent",color:a?"#fff":C.inkSoft,border:`1px solid ${a?C.ink:C.hair}`}}>{l}</button>);})}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Lbl>Tür</Lbl><select value={f.tur} onChange={e=>setF({...f,tur:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option>Çek</option><option>Senet</option></select></div>
          <div><Lbl>{f.tip==="alinan"?"Kimden":"Kime"}</Lbl><input list="cek-kisi" value={f.kisi} onChange={e=>setF({...f,kisi:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/><datalist id="cek-kisi">{kisiler.map(k=><option key={k.id} value={k.ad}/>)}</datalist></div>
          <Inp label="Banka" v={f.banka} set={v=>setF({...f,banka:v})}/><Inp label="Tutar ₺" v={f.tutar} set={v=>setF({...f,tutar:v})} num/>
          <div><Lbl>Vade</Lbl><input type="date" value={f.vade} onChange={e=>setF({...f,vade:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <Inp label="Açıklama" v={f.notu} set={v=>setF({...f,notu:v})} cls="col-span-2 md:col-span-3"/>
        </div>
        <div className="flex justify-end mt-3"><button onClick={ekle} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button></div>
      </div>)}
      <div className="flex gap-1.5">{[["hepsi","Hepsi"],["alinan","Alınan"],["verilen","Verilen"]].map(([k,l])=>(
        <button key={k} onClick={()=>setFiltre(k)} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{background:filtre===k?C.ink:"transparent",color:filtre===k?"#fff":C.inkSoft,border:`1px solid ${filtre===k?C.ink:C.hair}`}}>{l}</button>))}</div>
      <Tablo><thead><Tr head><Th>Vade</Th><Th>Tür / İlgili</Th><Th>Banka</Th><Th r>Tutar</Th><Th>Yön</Th><Th>Durum</Th><Th></Th></Tr></thead><tbody>
        {goster.map(c=>{const gecti=(c.durum==="Portföyde"||c.durum==="Beklemede")&&c.vade<TODAY; return(
          <Tr key={c.id}>
            <Td><span className="tabular-nums" style={{color:gecti?C.gider:C.inkSoft}}>{fTarih(c.vade)}</span>{gecti&&<div className="text-xs" style={{color:C.gider}}>vadesi geçti</div>}</Td>
            <Td><div className="font-medium">{c.kisi}</div><div className="text-xs" style={{color:C.inkSoft}}>{c.tur}{c.notu?` · ${c.notu}`:""}</div></Td>
            <Td><span style={{color:C.inkSoft}}>{c.banka}</span></Td>
            <Td r mono bold style={{color:c.tip==="alinan"?C.gelir:C.gider}}>{c.tip==="alinan"?"+":"−"}{tl(c.tutar)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(c.tutar,kur)}</div></Td>
            <Td><Rozet renk={c.tip==="alinan"?C.gelir:C.gider} bg={c.tip==="alinan"?C.gelirBg:C.giderBg}>{c.tip==="alinan"?"alınan":"verilen"}</Rozet></Td>
            <Td><select value={c.durum} onChange={e=>A.chequeStatus(c,e.target.value)} className="rounded px-2 py-1 text-xs font-medium outline-none" style={{background:dB(c.durum),color:dR(c.durum),border:"none"}}>{DURUMLAR[c.tip].map(d=><option key={d}>{d}</option>)}</select></Td>
            <Td>{canDelete&&<SilBtn onClick={()=>A.deleteCheque(c.id)}/>}</Td>
          </Tr>);})}
        {goster.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Kayıt yok.</span></Td></Tr>}
      </tbody></Tablo>
    </div>
  );
}

// === KULLANICILAR (sadece admin) ============================================
function Kullanicilar({me}){
  const [list,setList]=useState(null);
  const [sifreUser,setSifreUser]=useState(null);
  const [yeniSifre,setYeniSifre]=useState("");
  const [mesaj,setMesaj]=useState("");
  const [calisiyor,setCalisiyor]=useState(false);
  const yukle=async()=>setList(await db.loadProfiles());
  useEffect(()=>{ yukle(); },[]);
  const degis=async(id,role)=>{ try{ await db.setRole(id,role); await yukle(); }catch(e){ alert(e.message); } };

  const sifreKaydet=async()=>{
    setMesaj(""); if((yeniSifre||"").length<6){ setMesaj("Şifre en az 6 hane olmalı."); return; }
    setCalisiyor(true);
    try{
      const { data:{ session } } = await supabase.auth.getSession();
      const r=await fetch("/api/admin/set-password",{ method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId:sifreUser.id, password:yeniSifre }) });
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"İşlem başarısız");
      setMesaj("ok"); setYeniSifre("");
      setTimeout(()=>{ setSifreUser(null); setMesaj(""); },1200);
    }catch(e){ setMesaj(e.message); } finally{ setCalisiyor(false); }
  };

  if(!list) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" color={C.ink}/></div>;
  return (
    <div className="space-y-4">
      <Ozetcik etiket="Kullanıcı Sayısı" deger={sayi(list.length)}/>
      <Tablo><thead><Tr head><Th>E-posta</Th><Th>Rol</Th><Th r>İşlem</Th></Tr></thead><tbody>
        {list.map(p=>(<Tr key={p.id}>
          <Td><span className="font-medium">{p.email||p.id}</span>{p.id===me&&<span className="text-xs ml-2" style={{color:C.inkSoft}}>(sen)</span>}</Td>
          <Td><select value={p.role} disabled={p.id===me} onChange={e=>degis(p.id,e.target.value)} className="rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50" style={{border:`1px solid ${C.hair}`,background:C.paper}}>
            <option value="admin">Yönetici</option><option value="editor">Editör</option><option value="tedarik">Tedarik</option></select></Td>
          <Td r><button onClick={()=>{setSifreUser(p); setYeniSifre(""); setMesaj("");}} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium" style={{borderColor:C.hair,color:C.ink}}><KeyRound size={13}/> Şifre Değiştir</button></Td>
        </Tr>))}
      </tbody></Tablo>
      <div className="rounded-xl border p-4 text-sm" style={{background:C.surface,borderColor:C.hair,color:C.inkSoft}}>
        <b style={{color:C.ink}}>Roller:</b> <b style={{color:C.gelir}}>Yönetici</b> her şeyi yapar (silme + şifre değiştirme dahil). <b style={{color:C.gold}}>Editör</b> görür/ekler/düzenler, silemez. <b>Tedarik</b> yalnızca kumaşçı/tedarikçi görür. Kendi rolünü değiştiremezsin.
      </div>

      {sifreUser&&<Modal title="Şifre Değiştir" onClose={()=>setSifreUser(null)}>
        <p className="text-sm mb-3" style={{color:C.inkSoft}}>{sifreUser.email} için yeni şifre belirle.</p>
        <Lbl>Yeni şifre (en az 6 hane)</Lbl>
        <input value={yeniSifre} onChange={e=>setYeniSifre(e.target.value)} type="text" autoComplete="new-password"
          className="w-full mb-3 rounded-lg px-3 py-2.5 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
        {mesaj==="ok"
          ? <p className="text-sm mb-3" style={{color:C.gelir}}>Şifre güncellendi.</p>
          : mesaj && <p className="text-sm mb-3" style={{color:C.gider}}>{mesaj}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={()=>setSifreUser(null)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Vazgeç</button>
          <button onClick={sifreKaydet} disabled={calisiyor} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{background:C.ink}}>
            {calisiyor&&<Loader2 size={14} className="animate-spin"/>} Kaydet
          </button>
        </div>
      </Modal>}
    </div>
  );
}

// === DÖVİZ KURU =============================================================
function KurBar({kur,kaynak,durum,zaman,onCek,onElle}){
  const [duzenle,setDuzenle]=useState(false); const [tmp,setTmp]=useState({usd:"",eur:""});
  const [cev,setCev]=useState(""); // çevirici girişi (tutar)
  const [cevPb,setCevPb]=useState("TL"); // giriş para birimi: TL | USD | EUR
  const cevAmt=parse(cev);
  const tabanTL = cevPb==="USD" ? cevAmt*kur.usd : cevPb==="EUR" ? cevAmt*kur.eur : cevAmt;
  const cevVal={TL:tabanTL, USD:tabanTL/kur.usd, EUR:tabanTL/kur.eur};
  const cevSym={TL:"₺", USD:"$", EUR:"€"};
  const cevRenk={TL:C.ink, USD:C.gelir, EUR:C.gold};
  const fmt=(n)=>Number(n).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const kaydet=()=>{ onElle(parse(tmp.usd)||kur.usd,parse(tmp.eur)||kur.eur); setDuzenle(false); };
  const acD=()=>{ setTmp({usd:kur.usd.toFixed(2).replace(".",","),eur:kur.eur.toFixed(2).replace(".",",")}); setDuzenle(true); };
  const eK=kaynak==="canli"?`canlı · ${zaman}`:kaynak==="elle"?"elle girildi":"varsayılan";
  if(duzenle) return (
    <div className="flex flex-wrap items-end gap-3 mb-5 rounded-xl border p-3" style={{background:C.surface,borderColor:C.hair}}>
      <div className="w-28"><Lbl>USD/TRY</Lbl><input value={tmp.usd} onChange={e=>setTmp({...tmp,usd:e.target.value})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
      <div className="w-28"><Lbl>EUR/TRY</Lbl><input value={tmp.eur} onChange={e=>setTmp({...tmp,eur:e.target.value})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
      <button onClick={kaydet} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}><Check size={15}/> Kaydet</button>
      <button onClick={()=>setDuzenle(false)} className="rounded-lg px-3 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Vazgeç</button>
    </div>
  );
  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <KurChip icon={<DollarSign size={14} color={C.gelir}/>} etiket="USD/TRY" deger={`₺${fmt(kur.usd)}`}/>
        <KurChip icon={<Euro size={14} color={C.gold}/>} etiket="EUR/TRY" deger={`₺${fmt(kur.eur)}`}/>
        <button onClick={onCek} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium" style={{borderColor:C.hair,background:C.surface,color:C.inkSoft}}><RefreshCw size={13} className={durum==="yukleniyor"?"animate-spin":""}/> Yenile</button>
        <button onClick={acD} className="flex items-center justify-center rounded-full border h-7 w-7" style={{borderColor:C.hair,background:C.surface,color:C.inkSoft}}><Pencil size={12}/></button>
        <span className="text-xs" style={{color:C.inkSoft}}>{eK}</span>
      </div>

      {/* Anlık çevirici: para birimi seç → diğerlerini gör (telefonda sarar) */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border p-2" style={{borderColor:C.gold,background:C.goldBg}}>
        <ArrowRightLeft size={14} color={C.gold} className="shrink-0"/>
        <div className="flex gap-1 shrink-0">
          {["TL","USD","EUR"].map(k=>(
            <button key={k} onClick={()=>setCevPb(k)} className="h-8 w-8 rounded-full text-sm font-bold leading-none"
              style={{background:cevPb===k?C.ink:C.surface,color:cevPb===k?"#fff":C.inkSoft,border:`1px solid ${cevPb===k?C.ink:C.hair}`}}>{cevSym[k]}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[110px]">
          <input value={cev} onChange={e=>setCev(e.target.value)} inputMode="decimal" placeholder="Tutar girin"
            className="w-full rounded-full pl-3 pr-7 py-2 text-sm font-semibold outline-none tabular-nums text-right"
            style={{border:`1px solid ${C.hair}`,background:C.surface,color:C.ink}}/>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{color:C.inkSoft,pointerEvents:"none"}}>{cevSym[cevPb]}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold" style={{color:C.inkSoft}}>=</span>
          {["TL","USD","EUR"].filter(k=>k!==cevPb).map(k=>(
            <span key={k} className="text-sm font-semibold tabular-nums whitespace-nowrap" style={{color:cevRenk[k]}}>{cevSym[k]}{fmt(cevVal[k])}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
function KurChip({icon,etiket,deger}){
  return (<div className="flex items-center gap-2 rounded-full border px-3 py-1.5" style={{borderColor:C.hair,background:C.surface}}>
    <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{background:C.paper}}>{icon}</span>
    <span className="text-xs" style={{color:C.inkSoft}}>{etiket}</span>
    <span className="text-sm font-semibold tabular-nums" style={{color:C.ink}}>{deger}</span></div>);
}

// === Ortak parçalar =========================================================
function Merkez({children}){ return <div className="min-h-screen flex flex-col items-center justify-center text-center p-6" style={{background:C.paper,color:C.ink}}>{children}</div>; }
function KPI({etiket,deger,alt,renk=C.ink,icon,bg,onClick,dov:dovStr}){
  return (<button onClick={onClick} className="text-left rounded-xl border p-4 transition-all hover:shadow-sm" style={{background:C.surface,borderColor:C.hair}}>
    <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-wider" style={{color:C.inkSoft}}>{etiket}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{background:bg}}>{icon}</span></div>
    <div className="text-base sm:text-lg font-semibold tabular-nums" style={{color:renk,fontFamily:"Georgia, serif"}}>{deger}</div>
    {dovStr&&<div className="text-xs tabular-nums mt-0.5" style={{color:C.inkSoft}}>{dovStr}</div>}
    <div className="text-xs mt-0.5" style={{color:C.inkSoft}}>{alt}</div></button>);
}
function Ozetcik({etiket,deger,renk=C.ink,alt,dov:dovStr}){
  return (<div className="rounded-lg border px-4 py-2" style={{background:C.surface,borderColor:C.hair}}>
    <div className="text-xs uppercase tracking-wider" style={{color:C.inkSoft}}>{etiket}</div>
    <div className="text-base font-semibold tabular-nums" style={{color:renk}}>{deger}</div>
    {dovStr&&<div className="text-xs tabular-nums" style={{color:C.inkSoft}}>{dovStr}</div>}
    {alt&&<div className="text-xs" style={{color:C.inkSoft}}>{alt}</div>}</div>);
}
function Inp({label,v,set,num,cls=""}){
  return (<div className={cls}><Lbl>{label}</Lbl><input value={v} onChange={e=>set(e.target.value)} inputMode={num?"decimal":"text"} className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${num?"tabular-nums":""}`} style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>);
}
function Lbl({children}){return <label className="block text-xs font-medium mb-1.5" style={{color:C.inkSoft}}>{children}</label>;}
function Tablo({children,bare}){return <div className={bare?"overflow-x-auto":"rounded-xl border overflow-x-auto"} style={bare?{}:{background:C.surface,borderColor:C.hair}}><table className="w-full text-sm">{children}</table></div>;}
function Tr({children,head}){return <tr className={head?"":"border-t group"} style={head?{}:{borderColor:C.hair}}>{children}</tr>;}
function Th({children,r}){return <th className={`px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap ${r?"text-right":"text-left"}`} style={{color:C.inkSoft}}>{children}</th>;}
function Td({children,r,mono,bold,style={}}){return <td className={`px-4 py-3 align-top ${r?"text-right":"text-left"} ${mono?"tabular-nums":""} ${bold?"font-semibold":""}`} style={style}>{children}</td>;}
function Rozet({children,renk,bg}){return <span className="text-xs px-1.5 py-0.5 rounded capitalize whitespace-nowrap" style={{background:bg,color:renk}}>{children}</span>;}
function SilBtn({onClick}){return <button onClick={onClick} className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded" title="Sil"><Trash2 size={15} color={C.gider}/></button>;}
function Modal({title,children,onClose}){
  return (<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:"rgba(0,0,0,0.5)"}} onClick={onClose}>
    <div className="relative w-full sm:max-w-xl max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-xl" style={{background:C.surface}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0" style={{borderColor:C.hair,background:C.surface}}>
        <span className="text-base font-semibold" style={{fontFamily:"Georgia, serif"}}>{title}</span><button onClick={onClose}><X size={18} color={C.inkSoft}/></button></div>
      <div className="p-5">{children}</div></div></div>);
}
