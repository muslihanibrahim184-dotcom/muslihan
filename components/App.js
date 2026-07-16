"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Search, Boxes, ShoppingCart, Users, Truck, Scissors, LayoutDashboard,
  AlertTriangle, TrendingUp, X, Receipt, Coins, ArrowUpRight, ArrowDownRight, ScrollText,
  CalendarClock, LogOut, Loader2, RefreshCw, DollarSign, Euro, Pencil, Check, Phone, MapPin, ShieldCheck, UserCog, KeyRound, ArrowRightLeft, ClipboardList, Wallet, Printer, QrCode, Tag, Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as db from "@/lib/db";

const C = { paper:"#F4F4F5", surface:"#FFFFFF", ink:"#131417", inkSoft:"#71727A", hair:"#E6E7EA",
  gelir:"#0F7B57", gelirBg:"#E6F4EE", gider:"#C0392B", giderBg:"#FBEBE9", gold:"#8A6D3B", goldBg:"#F3ECDA" };
// Sekme/kart canlı renkleri (rengârenk ama rafine mücevher tonları)
const RENK = { ozet:"#4338CA", satis:"#047857", urun:"#B45309", musteri:"#0369A1", siparis:"#6D28D9", kumasci:"#BE123C", ted:"#0F766E", cek:"#BE185D", gider:"#C2410C", kullanicilar:"#475569" };
const N=(x)=>Number(x)||0;
const tl=(n)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(N(n));
const sayi=(n)=>new Intl.NumberFormat("tr-TR").format(N(n));
const d2=(n)=>Number(n).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const dov=(a,kur)=>(!kur||!a)?"":`$${d2(a/kur.usd)} · €${d2(a/kur.eur)}`;
const AYLAR=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const fTarih=(iso)=>{ if(!iso) return "—"; const d=new Date(iso+"T00:00:00"); return `${String(d.getDate()).padStart(2,"0")} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`; };
const odemeAd=(o)=>{ const l=String(o||"").toLowerCase(); if(l==="peşin"||l==="pesin") return "Nakit"; if(l==="veresiye") return "Veresiye"; if(l==="iade") return "İade"; return o||"—"; };
const esc=(x)=>String(x==null?"":x).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const yazdirPenceresi=(html)=>{ const w=window.open("","_blank","width=420,height=640"); if(!w){ alert("Yazdırma penceresi açılamadı. Tarayıcı açılır pencereye (pop-up) izin vermeli."); return; } w.document.open(); w.document.write(html); w.document.close(); };
const FIS_CSS=`*{box-sizing:border-box} body{font-family:'Courier New',monospace;color:#111;margin:0;padding:16px;background:#fff} .fis{max-width:340px;margin:0 auto} h1{font-family:Georgia,serif;font-size:20px;text-align:center;margin:0 0 2px} .alt{text-align:center;font-size:12px;color:#555;margin-bottom:8px} .cizgi{border-top:1px dashed #999;margin:8px 0} .satir{display:flex;justify-content:space-between;font-size:13px;margin:2px 0;gap:10px} table{width:100%;border-collapse:collapse;font-size:13px} th,td{text-align:left;padding:3px 0;vertical-align:top} td.r,th.r{text-align:right;white-space:nowrap} .toplam{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;margin-top:8px} .tesk{text-align:center;font-size:12px;color:#555;margin-top:14px} @media print{body{padding:0}}`;
function fisYazdir(s){
  const birim=N(s.birim_fiyat)||(N(s.adet)?N(s.tutar)/N(s.adet):0);
  const html=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Satış Fişi</title><style>${FIS_CSS}</style></head><body><div class="fis">
    <h1>Muslihan Tekstil</h1><div class="alt">Satış Fişi</div><div class="cizgi"></div>
    <div class="satir"><span>Tarih</span><b>${esc(fTarih(s.tarih))}</b></div>
    <div class="satir"><span>Müşteri</span><b>${esc(s.musteri_ad||"-")}</b></div>
    <div class="cizgi"></div>
    <table><thead><tr><th>Ürün</th><th class="r">Adet</th><th class="r">Birim</th><th class="r">Tutar</th></tr></thead>
    <tbody><tr><td>${esc(s.urun_ad)}</td><td class="r">${esc(sayi(s.adet))}</td><td class="r">${esc(tl(birim))}</td><td class="r">${esc(tl(s.tutar))}</td></tr></tbody></table>
    <div class="cizgi"></div>
    <div class="satir"><span>Ödeme Şekli</span><b>${esc(odemeAd(s.odeme))}</b></div>
    <div class="toplam"><span>TOPLAM</span><span>${esc(tl(s.tutar))}</span></div>
    <div class="tesk">Teşekkür ederiz.</div></div>
    <script>window.onload=function(){setTimeout(function(){window.print();},150);}<\/script></body></html>`;
  yazdirPenceresi(html);
}
function hesapOzetiYazdir(m, sales, collections){
  const items=sales.filter(s=>s.musteri_id===m.id).sort((a,b)=>a.tarih<b.tarih?1:-1);
  const tah=collections.filter(t=>t.musteri_id===m.id).sort((a,b)=>a.tarih<b.tarih?1:-1);
  const satirlar=items.map(s=>`<tr><td>${esc(fTarih(s.tarih))}</td><td>${esc(s.urun_ad)}${s.odeme?` <span style="color:#777">(${esc(odemeAd(s.odeme))})</span>`:""}</td><td class="r">${esc(sayi(s.adet))}</td><td class="r">${esc(tl(s.tutar))}</td></tr>`).join("")||`<tr><td colspan="4" style="color:#777">Kayıt yok</td></tr>`;
  const tahSatir=tah.map(t=>`<tr><td>${esc(fTarih(t.tarih))}</td><td>Tahsilat</td><td class="r">${esc(tl(t.tutar))}</td></tr>`).join("")||`<tr><td colspan="3" style="color:#777">Kayıt yok</td></tr>`;
  const html=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Hesap Özeti</title><style>${FIS_CSS} .fis{max-width:520px} h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#555;margin:14px 0 4px}</style></head><body><div class="fis">
    <h1>Muslihan Tekstil</h1><div class="alt">Müşteri Hesap Özeti</div><div class="cizgi"></div>
    <div class="satir"><span>Müşteri</span><b>${esc(m.ad)}</b></div>
    ${m.telefon&&m.telefon!=="—"?`<div class="satir"><span>Telefon</span><b>${esc(m.telefon)}</b></div>`:""}
    <div class="satir"><span>Tarih</span><b>${esc(fTarih(db.todayISO()))}</b></div>
    <h2>Aldığı Mallar</h2>
    <table><thead><tr><th>Tarih</th><th>Ürün</th><th class="r">Adet</th><th class="r">Tutar</th></tr></thead><tbody>${satirlar}</tbody></table>
    <h2>Tahsilatlar</h2>
    <table><thead><tr><th>Tarih</th><th></th><th class="r">Tutar</th></tr></thead><tbody>${tahSatir}</tbody></table>
    <div class="cizgi"></div>
    <div class="toplam"><span>${N(m.bakiye)>=0?"KALAN BORÇ":"ALACAKLI"}</span><span>${esc(tl(Math.abs(N(m.bakiye))))}</span></div>
    <div class="tesk">Teşekkür ederiz.</div></div>
    <script>window.onload=function(){setTimeout(function(){window.print();},150);}<\/script></body></html>`;
  yazdirPenceresi(html);
}
function OdemeRozet({odeme}){ const l=String(odeme||"").toLowerCase(); const iade=l==="iade"; const hesap=["veresiye","çek","cek","senet"].includes(l);
  const renk=iade?C.gider:hesap?C.gold:C.gelir; const bg=iade?C.giderBg:hesap?C.goldBg:C.gelirBg; return <Rozet renk={renk} bg={bg}>{odemeAd(odeme)}</Rozet>; }
const parse=(s)=>parseFloat(String(s).replace(/\./g,"").replace(",",".")) || 0;
// Yazarken binlik ayraç (1.000 · 100.000), ondalık virgül korunur
const fmtInput=(s)=>{ if(s==null) return ""; s=String(s).replace(/[^\d,]/g,""); const i=s.indexOf(",");
  let tam=i>=0?s.slice(0,i).replace(/,/g,""):s.replace(/,/g,""); let ond=i>=0?s.slice(i+1).replace(/,/g,""):null;
  tam=tam.replace(/^0+(?=\d)/,""); const grup=tam.replace(/\B(?=(\d{3})+(?!\d))/g,"."); return ond!=null?(grup||"0")+","+ond:grup; };
const KRITIK_ESIK=100; // 100 ve altı stok kritik sayılır
const SURUM="v37"; // yayın sürümü — canlı kod bu mu diye kontrol için
const kritikMi=(u)=>N(u.stok)<=Math.max(N(u.min_stok),KRITIK_ESIK);
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

  // Otomatik yenileme: uygulamaya dönünce + her 5 sn'de bir (işlem yokken)
  useEffect(()=>{
    const tazele=()=>{ if(document.visibilityState==="visible" && !busyRef.current) refresh(); };
    document.addEventListener("visibilitychange", tazele);
    window.addEventListener("focus", tazele);
    const id=setInterval(tazele, 5000);
    return ()=>{ document.removeEventListener("visibilitychange", tazele); window.removeEventListener("focus", tazele); clearInterval(id); };
  },[refresh]);

  // QR tarayıcı
  const [tara,setTara]=useState(false);
  // Telefonun kendi kamerasıyla okutulan QR (?u=<id>) doğrudan ürünü açsın
  const [qrUrun,setQrUrun]=useState(null);
  useEffect(()=>{ if(typeof window==="undefined") return;
    const id=new URLSearchParams(window.location.search).get("u"); if(!id) return;
    const u=(data?.products||[]).find(p=>p.id===id); if(u){ setQrUrun(u); window.history.replaceState({},"",window.location.pathname); }
  },[data?.products]);

  // Aşağı çekerek yenileme (pull-to-refresh)
  const [ptr,setPtr]=useState(0); const [ptrYukle,setPtrYukle]=useState(false);
  const ptrStart=useRef(null); const ptrAktif=useRef(false);
  const onTouchStart=(e)=>{ if((window.scrollY||0)<=0 && !busyRef.current){ ptrStart.current=e.touches[0].clientY; ptrAktif.current=true; } else { ptrAktif.current=false; } };
  const onTouchMove=(e)=>{ if(!ptrAktif.current||ptrStart.current==null) return;
    const dy=e.touches[0].clientY-ptrStart.current;
    if(dy>0 && (window.scrollY||0)<=0){ setPtr(Math.min(dy*0.5,80)); } else { setPtr(0); } };
  const onTouchEnd=async()=>{ if(!ptrAktif.current){ setPtr(0); return; }
    if(ptr>55){ setPtrYukle(true); setPtr(46); try{ await refresh(); }finally{ setPtrYukle(false); } }
    setPtr(0); ptrAktif.current=false; ptrStart.current=null; };

  if(hata && !data) return <Merkez><p style={{color:C.gider}}>{hata}</p><p className="text-sm mt-2" style={{color:C.inkSoft}}>SQL şemasını çalıştırdığınızdan emin olun.</p></Merkez>;
  if(!data || !rol) return <Merkez><Loader2 className="animate-spin" color={C.ink}/></Merkez>;

  const { products, customers, suppliers, sales, collections, supplierMov, cash, cheques, orders=[] } = data;
  const canDelete = rol==="admin";
  const giderler=[...cash].filter(c=>c.kategori==="gider"||(c.tip==="cikis"&&String(c.aciklama||"").startsWith("[Gider]"))).sort((a,b)=>((a.tarih||a.created_at)<(b.tarih||b.created_at)?1:-1));
  const toplamGider=giderler.reduce((a,b)=>a+N(b.amount),0);
  const acikSiparis=orders.filter(o=>o.durum!=="Teslim Edildi"&&o.durum!=="İptal").length;
  const stokDeger=products.reduce((a,b)=>a+N(b.stok)*N(b.giris),0);
  const kritik=products.filter(kritikMi).length;
  const toplamSatis=sales.reduce((a,b)=>a+N(b.tutar),0);
  const toplamKar=sales.reduce((a,b)=>a+N(b.kar),0);
  const musteriAlacak=customers.filter(m=>N(m.bakiye)>0).reduce((a,b)=>a+N(b.bakiye),0);
  const kumasciBorc=suppliers.filter(t=>t.grup==="kumasci"&&N(t.bakiye)>0).reduce((a,b)=>a+N(b.bakiye),0);
  const tedarikciBorc=suppliers.filter(t=>t.grup!=="kumasci"&&N(t.bakiye)>0).reduce((a,b)=>a+N(b.bakiye),0);
  const kasaBakiye=cash.reduce((a,b)=>a+(b.tip==="giris"?N(b.amount):-N(b.amount)),0);
  const alinanCek=cheques.filter(c=>c.tip==="alinan"&&c.durum==="Portföyde").reduce((a,b)=>a+N(b.tutar),0);
  const verilenCek=cheques.filter(c=>c.tip==="verilen"&&c.durum==="Beklemede").reduce((a,b)=>a+N(b.tutar),0);

  const A={
    sale:async({urunId,adet,musteriId,odeme,birimFiyat,tarih})=>{ const urun=products.find(p=>p.id===urunId); if(!urun) return "Ürün seçin";
      if(adet<=0) return "Adet girin"; if(adet>N(urun.stok)) return `Stok yetersiz (mevcut ${N(urun.stok)})`;
      if(["veresiye","çek","senet"].includes(String(odeme).toLowerCase())&&!musteriId) return "Bu ödeme türü için müşteri seçin";
      const musteri=customers.find(m=>m.id===musteriId)||null; await run(()=>db.recordSale({urun,adet,musteri,odeme,birimFiyat,tarih})); return null; },
    deleteSale:(s)=>run(()=>db.deleteSale(s,products,customers)),
    addProduct:(p)=>run(()=>db.addProduct(p)), updateProduct:(id,patch)=>run(()=>db.updateProduct(id,patch)), deleteProduct:(id)=>run(()=>db.deleteProduct(id)),
    addCustomer:(c)=>run(()=>db.addCustomer(c)), updateCustomer:(id,patch)=>run(()=>db.updateCustomer(id,patch)), deleteCustomer:(id)=>run(()=>db.deleteCustomer(id)),
    collect:(id,tutar,tarih)=>{ const m=customers.find(c=>c.id===id); if(!m||tutar<=0) return; return run(()=>db.collectFromCustomer(m,tutar,tarih)); },
    customerReturn:({musteriId,urunId,adet,tutar,tur,tarih,aciklama})=>{ const m=customers.find(c=>c.id===musteriId); if(!m) return; const urun=products.find(p=>p.id===urunId)||null; return run(()=>db.customerReturn({musteri:m,urun,adet,tutar,tur,tarih,aciklama})); },
    addSupplier:(s)=>run(()=>db.addSupplier(s)), updateSupplier:(id,patch)=>run(()=>db.updateSupplier(id,patch)), deleteSupplier:(id)=>run(()=>db.deleteSupplier(id)),
    purchase:(id,ac,tutar,odeme,tarih)=>{ const t=suppliers.find(s=>s.id===id); if(!t||tutar<=0) return; return run(()=>db.supplierPurchase(t,ac,tutar,odeme,tarih)); },
    pay:(id,tutar,aciklama,tarih)=>{ const t=suppliers.find(s=>s.id===id); if(!t||tutar<=0) return; return run(()=>db.supplierPay(t,tutar,aciklama,tarih)); },
    addCheque:(c)=>run(()=>db.addCheque(c)), updateCheque:(id,p)=>run(()=>db.updateCheque(id,p)), deleteCheque:(id)=>run(()=>db.deleteCheque(id)), chequeStatus:(c,d)=>run(()=>db.setChequeStatus(c,d)),
    addOrder:(o)=>run(()=>db.addOrder(o)), updateOrder:(id,p)=>run(()=>db.updateOrder(id,p)), deleteOrder:(id)=>run(()=>db.deleteOrder(id)),
    addExpense:(e)=>run(()=>db.addExpense(e)), deleteExpense:(id)=>run(()=>db.deleteCashEntry(id)),
  };

  const TUM=[
    {k:"ozet",l:"Genel Bakış",I:LayoutDashboard},
    {k:"satis",l:"Satış",I:ShoppingCart},
    {k:"urun",l:"Ürünler",I:Boxes},
    {k:"musteri",l:"Müşteriler",I:Users},
    {k:"siparis",l:"Siparişler",I:ClipboardList},
    {k:"kumasci",l:"Kumaşçılar",I:Truck},
    {k:"ted",l:"Tedarikçiler",I:Scissors},
    {k:"cek",l:"Çek / Senet",I:ScrollText},
    {k:"gider",l:"Gider",I:Wallet},
  ];
  let SEKMELER = rol==="tedarik" ? TUM.filter(s=>s.k==="siparis"||s.k==="kumasci"||s.k==="ted"||s.k==="cek") : [...TUM];
  if(rol==="admin") SEKMELER=[...SEKMELER,{k:"kullanicilar",l:"Kullanıcılar",I:UserCog}];
  const aktif = SEKMELER.some(s=>s.k===sekme) ? sekme : SEKMELER[0].k;

  return (
    <div style={{background:C.paper,color:C.ink,minHeight:"100vh"}} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{height:ptr,overflow:"hidden",transition:ptrAktif.current?"none":"height 0.25s",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span className="flex items-center gap-2 text-xs" style={{color:C.inkSoft}}>
          {ptrYukle? <><Loader2 size={14} className="animate-spin"/> Yenileniyor…</> : ptr>55? "↑ Bırak, yenilensin" : ptr>0? "↓ Yenilemek için çek" : ""}
        </span>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6" style={{transition:ptrAktif.current?"none":"transform 0.25s"}}>
        <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg" style={{background:`linear-gradient(135deg, ${RENK.ozet}, ${RENK.cek} 45%, ${RENK.urun})`}}><ShoppingCart size={20} color="#fff"/></div>
            <div><h1 className="text-2xl sm:text-3xl leading-none" style={{fontFamily:"'Instrument Serif', Georgia, serif",letterSpacing:"0.01em"}}>Muslihan Tekstil</h1>
              <p className="text-xs sm:text-sm mt-1" style={{color:C.inkSoft}}>Mağaza takip sistemi · <span style={{color:C.gold}}>{SURUM}</span></p></div>
          </div>
          <div className="flex items-center gap-2">
            {busy && <Loader2 size={16} className="animate-spin" color={C.inkSoft}/>}
            <button onClick={()=>setTara(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{background:RENK.satis}}><QrCode size={15}/> <span className="hidden sm:inline">QR Okut</span></button>
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{background:C.gelirBg,color:C.gelir}}><ShieldCheck size={12}/> {ROL_AD[rol]}</span>
            <span className="hidden sm:block text-sm max-w-[150px] truncate" style={{color:C.inkSoft}}>{session?.user?.email}</span>
            <button onClick={()=>supabase.auth.signOut()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium" style={{borderColor:C.hair,background:C.surface}}><LogOut size={15}/> Çıkış</button>
          </div>
        </header>

        <KurBar kur={kur} kaynak={kurK} durum={kurD} zaman={kurZ} onCek={kurCek} onElle={kurElle}/>

        <div className="flex gap-1.5 mb-6 border-b pb-3 overflow-x-auto" style={{borderColor:C.hair}}>
          {SEKMELER.map(({k,l,I})=>{const rc=RENK[k]||C.ink; const a=aktif===k; return(
            <button key={k} onClick={()=>setSekme(k)} className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all"
              style={{background:a?rc:rc+"14",color:a?"#fff":rc,border:`1px solid ${a?rc:rc+"33"}`}}>
              <I size={15} color={a?"#fff":rc}/> {l}{k==="urun"&&kritik>0&&<span className="ml-1 text-xs px-1.5 rounded-full" style={{background:a?"#ffffff33":C.giderBg,color:a?"#fff":C.gider}}>{kritik}</span>}{k==="siparis"&&acikSiparis>0&&<span className="ml-1 text-xs px-1.5 rounded-full" style={{background:a?"#ffffff33":C.goldBg,color:a?"#fff":C.gold}}>{acikSiparis}</span>}
            </button>);})}
        </div>

        {aktif==="ozet" && <Ozet {...{stokDeger,kritik,kasaBakiye,toplamSatis,toplamKar,musteriAlacak,kumasciBorc,tedarikciBorc,alinanCek,verilenCek,cheques,sales,products,giderler,kur}} git={setSekme}/>}
        {aktif==="satis" && <Satis {...{products,customers,sales,kur,A,canDelete}}/>}
        {aktif==="urun" && <Urunler {...{products,stokDeger,kur,A,canDelete}}/>}
        {aktif==="musteri" && <Musteriler {...{customers,sales,collections,orders,products,musteriAlacak,kur,A,canDelete}}/>}
        {aktif==="siparis" && <Siparisler {...{orders,customers,kur,A,canDelete,rol}}/>}
        {aktif==="kumasci" && <SupplierScreen grup="kumasci" toplam={kumasciBorc} kur={kur} {...{suppliers,supplierMov,A,canDelete}}/>}
        {aktif==="ted" && <SupplierScreen grup="tedarikci" toplam={tedarikciBorc} kur={kur} {...{suppliers,supplierMov,A,canDelete}}/>}
        {aktif==="cek" && <CekSenet {...{cheques,customers,suppliers,alinanCek,verilenCek,kur,A,canDelete}}/>}
        {aktif==="gider" && <Gider {...{giderler,toplamGider,kur,A,canDelete}}/>}
        {aktif==="kullanicilar" && <Kullanicilar me={session?.user?.id}/>}
      </div>
      {tara && <QrTara products={products} customers={customers} kur={kur} A={A} onClose={()=>setTara(false)}/>}
      {qrUrun && <Modal title="Ürün" onClose={()=>setQrUrun(null)}><UrunKarti urun={products.find(p=>p.id===qrUrun.id)||qrUrun} customers={customers} kur={kur} A={A} onClose={()=>setQrUrun(null)}/></Modal>}
    </div>
  );
}

// === GENEL BAKIŞ ============================================================
function Ozet({stokDeger,kritik,kasaBakiye,toplamSatis,toplamKar,musteriAlacak,kumasciBorc,tedarikciBorc,alinanCek,verilenCek,cheques,sales,products,giderler=[],kur,git}){
  const sonSatis=[...sales].sort((a,b)=>(a.tarih<b.tarih?1:-1)).slice(0,5);
  const kritikler=products.filter(kritikMi);
  const yaklasan=[...cheques].filter(c=>c.durum==="Portföyde"||c.durum==="Beklemede").sort((a,b)=>a.vade.localeCompare(b.vade)).slice(0,5);
  const gunAgg={}; sales.forEach(s=>{const g=(s.tarih||"").slice(0,10); if(!g)return; const o=gunAgg[g]||(gunAgg[g]={ciro:0,kar:0,iade:0,gider:0,n:0}); o.ciro+=N(s.tutar); o.kar+=N(s.kar); if(s.odeme==="iade") o.iade+=Math.abs(N(s.tutar)); else o.n+=1;});
  giderler.forEach(g=>{const t=(g.tarih||(g.created_at||"")).slice(0,10); if(!t)return; const o=gunAgg[t]||(gunAgg[t]={ciro:0,kar:0,iade:0,gider:0,n:0}); o.gider+=N(g.amount);});
  const gunler=Object.entries(gunAgg).sort((a,b)=>a[0]<b[0]?1:-1).slice(0,14);
  const bugunCiro=gunAgg[TODAY]?.ciro||0, bugunKar=gunAgg[TODAY]?.kar||0;
  // Ay bazlı: ciro (TL/$/€), iade, kâr, gider, net
  const ayAgg={}; sales.forEach(s=>{const a=(s.tarih||"").slice(0,7); if(!a)return; const o=ayAgg[a]||(ayAgg[a]={ciro:0,kar:0,iade:0,gider:0,n:0}); o.ciro+=N(s.tutar); o.kar+=N(s.kar); if(s.odeme==="iade") o.iade+=Math.abs(N(s.tutar)); else o.n+=1;});
  giderler.forEach(g=>{const a=(g.tarih||(g.created_at||"")).slice(0,7); if(!a)return; const o=ayAgg[a]||(ayAgg[a]={ciro:0,kar:0,iade:0,gider:0,n:0}); o.gider+=N(g.amount);});
  const aylar=Object.entries(ayAgg).sort((a,b)=>a[0]<b[0]?1:-1);
  const ayTop=aylar.reduce((t,[,o])=>({ciro:t.ciro+o.ciro,kar:t.kar+o.kar,gider:t.gider+o.gider,iade:t.iade+o.iade}),{ciro:0,kar:0,gider:0,iade:0});
  const [acikAy,setAcikAy]=useState(null);
  const ayAdi=(a)=>{const [y,m]=a.split("-"); return `${AYLAR[Number(m)-1]} ${y}`;};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <KPI etiket="Bugünkü Ciro" deger={tl(bugunCiro)} dov={dov(bugunCiro,kur)} alt={`bugünkü kâr ${tl(bugunKar)}`} renk={RENK.satis} ac={RENK.satis} icon={<CalendarClock size={18} color={RENK.satis}/>} bg={RENK.satis+"1A"} onClick={()=>git("satis")}/>
        <KPI etiket="Toplam Satış" deger={tl(toplamSatis)} dov={dov(toplamSatis,kur)} alt={`${sales.length} işlem`} renk={RENK.ozet} ac={RENK.ozet} icon={<ShoppingCart size={18} color={RENK.ozet}/>} bg={RENK.ozet+"1A"} onClick={()=>git("satis")}/>
        <KPI etiket="Toplam Kâr" deger={tl(toplamKar)} dov={dov(toplamKar,kur)} alt="giriş–satış farkı" renk={toplamKar>=0?C.gelir:C.gider} ac={toplamKar>=0?C.gelir:C.gider} icon={<TrendingUp size={18} color={toplamKar>=0?C.gelir:C.gider}/>} bg={toplamKar>=0?C.gelirBg:C.giderBg} onClick={()=>git("satis")}/>
        <KPI etiket="Kasa" deger={tl(kasaBakiye)} dov={dov(kasaBakiye,kur)} alt="peşin nakit" renk={C.gold} ac={C.gold} icon={<Coins size={18} color={C.gold}/>} bg={C.goldBg}/>
        <KPI etiket="Müşteri Alacağı" deger={tl(musteriAlacak)} dov={dov(musteriAlacak,kur)} alt="tahsil edilecek" renk={RENK.musteri} ac={RENK.musteri} icon={<ArrowUpRight size={18} color={RENK.musteri}/>} bg={RENK.musteri+"1A"} onClick={()=>git("musteri")}/>
        <KPI etiket="Kumaşçı Borcu" deger={tl(kumasciBorc)} dov={dov(kumasciBorc,kur)} alt="ödenecek" renk={RENK.kumasci} ac={RENK.kumasci} icon={<Truck size={18} color={RENK.kumasci}/>} bg={RENK.kumasci+"1A"} onClick={()=>git("kumasci")}/>
        <KPI etiket="Tedarikçi Borcu" deger={tl(tedarikciBorc)} dov={dov(tedarikciBorc,kur)} alt="ödenecek" renk={RENK.ted} ac={RENK.ted} icon={<ArrowDownRight size={18} color={RENK.ted}/>} bg={RENK.ted+"1A"} onClick={()=>git("ted")}/>
        <KPI etiket="Stok Değeri" deger={tl(stokDeger)} dov={dov(stokDeger,kur)} alt={`${products.length} ürün · ${kritik} kritik`} renk={RENK.urun} ac={RENK.urun} icon={<Boxes size={18} color={RENK.urun}/>} bg={RENK.urun+"1A"} onClick={()=>git("urun")}/>
        <KPI etiket="Alınan Çek" deger={tl(alinanCek)} dov={dov(alinanCek,kur)} alt="portföyde" renk={RENK.cek} ac={RENK.cek} icon={<ScrollText size={18} color={RENK.cek}/>} bg={RENK.cek+"1A"} onClick={()=>git("cek")}/>
        <KPI etiket="Verilen Çek" deger={tl(verilenCek)} dov={dov(verilenCek,kur)} alt="vadesi gelecek" renk={C.gider} ac={C.gider} icon={<ScrollText size={18} color={C.gider}/>} bg={C.giderBg} onClick={()=>git("cek")}/>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{background:C.surface,borderColor:C.hair}}>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{color:C.inkSoft}}><CalendarClock size={14}/> Günlük Ciro <span className="normal-case font-normal" style={{color:C.inkSoft}}>· son {gunler.length} gün</span></h3>
        <Tablo bare><thead><Tr head><Th>Tarih</Th><Th r>Ciro</Th><Th r>İade</Th><Th r>Masraf</Th><Th r>Kâr</Th></Tr></thead><tbody>
          {gunler.map(([g,o])=>(<Tr key={g}>
            <Td><span className="tabular-nums" style={{color:g===TODAY?C.ink:C.inkSoft,fontWeight:g===TODAY?700:400}}>{fTarih(g)}{g===TODAY?" · bugün":""}</span></Td>
            <Td r mono bold style={{color:N(o.ciro)>=0?C.ink:C.gider}}>{tl(o.ciro)}<div className="text-xs font-normal tabular-nums" style={{color:C.inkSoft}}>{dov(o.ciro,kur)}</div></Td>
            <Td r mono style={{color:C.gider}}>{o.iade>0?"−"+tl(o.iade):"—"}</Td>
            <Td r mono style={{color:C.gider}}>{o.gider>0?"−"+tl(o.gider):"—"}</Td>
            <Td r mono style={{color:N(o.kar)>=0?C.gelir:C.gider}}>{tl(o.kar)}</Td>
          </Tr>))}
          {gunler.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz satış yok.</span></Td></Tr>}
        </tbody></Tablo>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{background:C.surface,borderColor:C.hair}}>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{color:C.inkSoft}}><CalendarClock size={14}/> Aylık Ciro <span className="normal-case font-normal" style={{color:C.inkSoft}}>· tüm aylar · aya tıkla, günleri gör</span></h3>
        <Tablo bare><thead><Tr head><Th>Ay</Th><Th r>Ciro ₺</Th><Th r>Ciro $</Th><Th r>Ciro €</Th><Th r>İade</Th><Th r>Masraf</Th><Th r>Kâr</Th></Tr></thead><tbody>
          {aylar.map(([a,o])=>{const acik=acikAy===a; const gunlerAy=Object.entries(gunAgg).filter(([g])=>g.startsWith(a)).sort((x,y)=>x[0]<y[0]?1:-1); return(
            <Fragment key={a}>
              <Tr onClick={()=>setAcikAy(acik?null:a)}>
                <Td><span className="font-medium">{ayAdi(a)}</span><div className="text-xs" style={{color:C.inkSoft}}>{o.n} satış · {acik?"gizle":"günleri gör"}</div></Td>
                <Td r mono bold>{tl(o.ciro)}</Td>
                <Td r mono style={{color:C.inkSoft}}>${d2(N(o.ciro)/kur.usd)}</Td>
                <Td r mono style={{color:C.inkSoft}}>€{d2(N(o.ciro)/kur.eur)}</Td>
                <Td r mono style={{color:C.gider}}>{o.iade>0?"−"+tl(o.iade):"—"}</Td>
                <Td r mono style={{color:C.gider}}>{o.gider>0?"−"+tl(o.gider):"—"}</Td>
                <Td r mono style={{color:N(o.kar)>=0?C.gelir:C.gider}}>{tl(o.kar)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>net {tl(N(o.kar)-N(o.gider))}</div></Td>
              </Tr>
              {acik&&gunlerAy.map(([g,d])=>(<Tr key={g}>
                <Td><span className="tabular-nums pl-4 text-xs" style={{color:C.inkSoft}}>↳ {fTarih(g)}</span></Td>
                <Td r mono style={{color:C.inkSoft}}>{tl(d.ciro)}</Td>
                <Td r mono style={{color:C.inkSoft}}>${d2(N(d.ciro)/kur.usd)}</Td>
                <Td r mono style={{color:C.inkSoft}}>€{d2(N(d.ciro)/kur.eur)}</Td>
                <Td r mono style={{color:C.inkSoft}}>{d.iade>0?"−"+tl(d.iade):"—"}</Td>
                <Td r mono style={{color:d.gider>0?C.gider:C.inkSoft}}>{d.gider>0?"−"+tl(d.gider):"—"}</Td>
                <Td r mono style={{color:C.inkSoft}}>{tl(d.kar)}</Td>
              </Tr>))}
            </Fragment>);})}
          {aylar.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz kayıt yok.</span></Td></Tr>}
          {aylar.length>0&&<Tr>
            <Td><span className="font-semibold">TOPLAM</span></Td>
            <Td r mono bold>{tl(ayTop.ciro)}</Td>
            <Td r mono bold style={{color:C.inkSoft}}>${d2(N(ayTop.ciro)/kur.usd)}</Td>
            <Td r mono bold style={{color:C.inkSoft}}>€{d2(N(ayTop.ciro)/kur.eur)}</Td>
            <Td r mono style={{color:C.gider}}>{ayTop.iade>0?"−"+tl(ayTop.iade):"—"}</Td>
            <Td r mono style={{color:C.gider}}>{ayTop.gider>0?"−"+tl(ayTop.gider):"—"}</Td>
            <Td r mono bold style={{color:N(ayTop.kar)>=0?C.gelir:C.gider}}>{tl(ayTop.kar)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>net {tl(N(ayTop.kar)-N(ayTop.gider))}</div></Td>
          </Tr>}
        </tbody></Tablo>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border overflow-hidden" style={{background:C.surface,borderColor:C.hair}}>
          <h3 className="text-sm font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{color:C.inkSoft}}>Son Satışlar</h3>
          <Tablo bare><thead><Tr head><Th>Tarih</Th><Th>Ürün</Th><Th r>Tutar</Th><Th r>Kâr</Th><Th>Ödeme</Th></Tr></thead><tbody>
            {sonSatis.map(s=>(<Tr key={s.id}>
              <Td><span className="tabular-nums" style={{color:C.inkSoft}}>{fTarih(s.tarih)}</span></Td>
              <Td><div className="font-medium">{s.urun_ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{sayi(s.adet)} adet · {s.musteri_ad}</div></Td>
              <Td r mono bold>{tl(s.tutar)}<div className="text-xs font-normal tabular-nums" style={{color:C.inkSoft}}>{dov(s.tutar,kur)}</div></Td><Td r mono style={{color:N(s.kar)>=0?C.gelir:C.gider}}>{tl(s.kar)}</Td>
              <Td><OdemeRozet odeme={s.odeme}/></Td>
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
  const [f,setF]=useState({urunId:"",adet:"",fiyat:"",pb:"TL",musteriId:"",odeme:"Nakit",tarih:TODAY}); const [hata,setHata]=useState("");
  const [yeniAc,setYeniAc]=useState(false); const [yeniM,setYeniM]=useState({ad:"",telefon:"",adres:""});
  const toTr=(n)=>String(Math.round(n*100)/100).replace(".",",");
  const pb=f.pb||"TL"; const sym={TL:"₺",USD:"$",EUR:"€"};
  const u=products.find(x=>x.id===f.urunId); const adet=parse(f.adet);
  const birimGiris=parse(f.fiyat);
  const birimTL = pb==="USD" ? birimGiris*kur.usd : pb==="EUR" ? birimGiris*kur.eur : birimGiris;
  const birim = birimTL>0 ? birimTL : N(u?.satis);
  const fiyatDegisti=u&&birim>0&&Math.round(birim)!==Math.round(N(u.satis));
  const onizleme=u?{tutar:adet*birim,kar:adet*(birim-N(u.giris))}:null;
  // ürünü seçince liste fiyatını, seçili para birimine çevirerek doldur
  const urunSec=(id)=>{ const p=products.find(x=>x.id===id); if(!p){setF({...f,urunId:id,fiyat:""});return;}
    const v = pb==="USD" ? N(p.satis)/kur.usd : pb==="EUR" ? N(p.satis)/kur.eur : N(p.satis);
    setF({...f,urunId:id,fiyat:fmtInput(toTr(v))}); };
  // para birimi değişince mevcut fiyatı yeni birime çevir (değer aynı kalsın)
  const pbDegis=(yeniPb)=>{ const v=parse(f.fiyat); if(v<=0){setF({...f,pb:yeniPb});return;}
    const tlv = pb==="USD" ? v*kur.usd : pb==="EUR" ? v*kur.eur : v;
    const yeni = yeniPb==="USD" ? tlv/kur.usd : yeniPb==="EUR" ? tlv/kur.eur : tlv;
    setF({...f,pb:yeniPb,fiyat:fmtInput(toTr(yeni))}); };
  const yap=async()=>{ const r=await A.sale({urunId:f.urunId,adet,musteriId:f.musteriId||null,odeme:f.odeme,birimFiyat:birim,tarih:f.tarih}); if(r){setHata(r);return;} setHata(""); setF({urunId:"",adet:"",fiyat:"",pb:f.pb,musteriId:"",odeme:f.odeme,tarih:f.tarih}); };
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
          <div><Lbl>Adet</Lbl><input value={f.adet} onChange={e=>setF({...f,adet:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Birim Fiyat</Lbl>
            <div className="flex gap-1.5">
              <select value={pb} onChange={e=>pbDegis(e.target.value)} className="rounded-lg px-2 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${pb!=="TL"?C.gold:C.hair}`,background:C.paper,color:pb!=="TL"?C.gold:C.ink}}>
                <option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option>
              </select>
              <input value={f.fiyat} onChange={e=>setF({...f,fiyat:fmtInput(e.target.value)})} inputMode="decimal" placeholder="0" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${fiyatDegisti?C.gold:C.hair}`,background:C.paper}}/>
            </div>
            {pb!=="TL"&&birimTL>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(birimTL)}/adet</div>}
          </div>
          <div><div className="flex items-center justify-between"><Lbl>Müşteri</Lbl><button onClick={()=>setYeniAc(!yeniAc)} className="text-xs font-medium mb-1.5" style={{color:C.gelir}}>+ Yeni</button></div>
            <select value={f.musteriId} onChange={e=>setF({...f,musteriId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>
            <option value="">Peşin müşteri</option>{customers.map(m=><option key={m.id} value={m.id}>{m.ad}</option>)}</select></div>
          <div className="md:col-span-2"><Lbl>Ödeme Şekli</Lbl><div className="flex gap-1.5 flex-wrap">{["Nakit","Kredi Kartı","Çek","Senet","Veresiye"].map(o=>{const a=f.odeme===o;return(
            <button key={o} onClick={()=>setF({...f,odeme:o})} className="rounded-lg px-3 py-2 text-sm font-medium" style={{background:a?C.ink:"transparent",color:a?"#fff":C.inkSoft,border:`1px solid ${a?C.ink:C.hair}`}}>{o}</button>);})}</div></div>
          <div className="md:col-span-2"><Lbl>Tarih</Lbl><input type="date" value={f.tarih} onChange={e=>setF({...f,tarih:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
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
              <span className="text-sm" style={{color:C.inkSoft}}>Birim: <b style={{color:fiyatDegisti?C.gold:C.ink}}>{pb==="TL"?tl(birim):`${sym[pb]}${f.fiyat} (${tl(birim)})`}</b>{fiyatDegisti&&<span className="text-xs" style={{color:C.inkSoft}}> · liste {tl(u.satis)}</span>}</span>
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
          <Td><OdemeRozet odeme={s.odeme}/></Td>
          <Td><div className="flex items-center justify-end gap-1">
            <button onClick={()=>fisYazdir(s)} className="p-1.5 rounded" title="Fiş yazdır"><Printer size={15} color={C.inkSoft}/></button>
            {canDelete&&<SilBtn onClick={()=>A.deleteSale(s)}/>}
          </div></Td>
        </Tr>))}
        {liste.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz satış yok.</span></Td></Tr>}
      </tbody></Tablo>
    </div>
  );
}

// === ÜRÜNLER ================================================================
function Urunler({products,stokDeger,kur,A,canDelete}){
  const [ac,setAc]=useState(false);
  const [etiketAc,setEtiketAc]=useState(false);
  const [yukleniyor,setYukleniyor]=useState(false);
  const [buyuk,setBuyuk]=useState(null); // büyütülen fotoğraf
  const [sec,setSec]=useState({}); // id -> adet
  const [yaz,setYaz]=useState(false);
  const etiketYaz=async()=>{ const liste=Object.entries(sec).map(([id,n])=>({urun:products.find(p=>p.id===id),adet:Math.max(1,parse(n)||1)})).filter(x=>x.urun);
    if(!liste.length) return; setYaz(true); try{ await etiketYazdir(liste); } catch(e){ alert("Etiket oluşturulamadı: "+(e.message||e)); } finally{ setYaz(false); } };
  const bos={ad:"",kod:"",kategori:"",renk:"",foto:"",stok:"",birim:"adet",giris:"",satis:"",min:"",pb:"TL"};
  const [f,setF]=useState(bos); const [arama,setArama]=useState("");
  const [duz,setDuz]=useState(null); // düzenlenen ürün
  const [df,setDf]=useState(bos);
  const sym={TL:"₺",USD:"$",EUR:"€"};
  const carpan=(p)=>p==="USD"?kur.usd:p==="EUR"?kur.eur:1;
  const toTr=(n)=>String(Math.round(n*100)/100).replace(".",",");
  // para birimi değişince giriş+satış değerlerini yeni birime çevir
  const pbDegis=(ff,setFf,yeniPb)=>{ const eski=ff.pb||"TL"; const g=parse(ff.giris), s=parse(ff.satis);
    const conv=(v)=> v>0 ? fmtInput(toTr((v*carpan(eski))/carpan(yeniPb))) : "";
    setFf({...ff,pb:yeniPb,giris:g>0?conv(g):ff.giris,satis:s>0?conv(s):ff.satis}); };
  const ekle=async()=>{ if(!f.ad.trim())return; const c=carpan(f.pb||"TL");
    await A.addProduct({ad:f.ad.trim(),kod:f.kod||"—",kategori:f.kategori||"Genel",renk:f.renk.trim(),foto:f.foto||"",stok:parse(f.stok),birim:f.birim,giris:parse(f.giris)*c,satis:parse(f.satis)*c,min_stok:parse(f.min)}); setF(bos); setAc(false); };
  const duzenleAc=(s)=>{ setDf({ad:s.ad,kod:s.kod==="—"?"":s.kod,kategori:s.kategori==="Genel"?"":s.kategori,renk:s.renk||"",foto:s.foto||"",stok:String(s.stok),birim:s.birim||"adet",giris:String(s.giris),satis:String(s.satis),min:String(s.min_stok),pb:"TL"}); setDuz(s); };
  const duzenleKaydet=async()=>{ if(!df.ad.trim())return; const c=carpan(df.pb||"TL");
    await A.updateProduct(duz.id,{ad:df.ad.trim(),kod:df.kod||"—",kategori:df.kategori||"Genel",renk:df.renk.trim(),foto:df.foto||"",stok:parse(df.stok),birim:df.birim,giris:parse(df.giris)*c,satis:parse(df.satis)*c,min_stok:parse(df.min)}); setDuz(null); };
  const goster=products.filter(u=>(u.ad+u.kod+u.kategori+(u.renk||"")).toLowerCase().includes(arama.toLowerCase()));
  const FormGrid=(ff,setFf)=>{ const p=ff.pb||"TL"; return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Inp label="Ürün adı" v={ff.ad} set={v=>setFf({...ff,ad:v})} cls="col-span-2"/><Inp label="Kod" v={ff.kod} set={v=>setFf({...ff,kod:v})}/><Inp label="Kategori" v={ff.kategori} set={v=>setFf({...ff,kategori:v})}/>
      <Inp label="Renk" v={ff.renk} set={v=>setFf({...ff,renk:v})} cls="col-span-2"/>
      <Inp label="Stok" v={ff.stok} set={v=>setFf({...ff,stok:v})} num/>
      <div><Lbl>Birim</Lbl><select value={ff.birim} onChange={e=>setFf({...ff,birim:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>{["adet","top","mt","kg","paket"].map(b=><option key={b}>{b}</option>)}</select></div>
      <div><Lbl>Fiyat Birimi</Lbl><select value={p} onChange={e=>pbDegis(ff,setFf,e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${p!=="TL"?C.gold:C.hair}`,background:C.paper,color:p!=="TL"?C.gold:C.ink}}><option value="TL">₺ TL</option><option value="USD">$ Dolar</option><option value="EUR">€ Euro</option></select></div>
      <div><Lbl>Giriş {sym[p]} (maliyet)</Lbl><input value={ff.giris} onChange={e=>setFf({...ff,giris:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>{p!=="TL"&&parse(ff.giris)>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(parse(ff.giris)*carpan(p))}</div>}</div>
      <div><Lbl>Satış {sym[p]}</Lbl><input value={ff.satis} onChange={e=>setFf({...ff,satis:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>{p!=="TL"&&parse(ff.satis)>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(parse(ff.satis)*carpan(p))}</div>}</div>
      <Inp label="Min. stok" v={ff.min} set={v=>setFf({...ff,min:v})} num/>
      <div className="col-span-2 md:col-span-4"><Lbl>Fotoğraf</Lbl>
        <div className="flex items-center gap-3">
          {ff.foto
            ? <img src={ff.foto} alt="" className="h-24 w-24 rounded-lg object-cover" style={{border:`1px solid ${C.hair}`}}/>
            : <div className="flex h-24 w-24 items-center justify-center rounded-lg" style={{border:`1px dashed ${C.hair}`,background:C.paper}}><ImageIcon size={22} color={C.inkSoft}/></div>}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,background:C.surface}}>
              {yukleniyor?"Yükleniyor…":ff.foto?"Değiştir":"Fotoğraf Seç"}
              <input type="file" accept="image/*" className="hidden" disabled={yukleniyor} onChange={async e=>{const dosya=e.target.files?.[0]; e.target.value=""; if(!dosya) return;
                setYukleniyor(true); try{ const url=await db.uploadProductPhoto(dosya); setFf({...ff,foto:url}); }catch(err){ alert(err.message||"Fotoğraf yüklenemedi"); } finally{ setYukleniyor(false); } }}/>
            </label>
            {ff.foto&&<button onClick={()=>setFf({...ff,foto:""})} className="rounded-lg px-3 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.gider}}>Kaldır</button>}
          </div>
        </div>
      </div>
    </div>
  );};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Ozetcik etiket="Toplam Stok Değeri (giriş)" deger={tl(stokDeger)} dov={dov(stokDeger,kur)}/>
        <div className="flex gap-2">
          <button onClick={()=>setEtiketAc(true)} className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold" style={{borderColor:C.hair,background:C.surface,color:C.ink}}><Tag size={16}/> Etiket Yazdır</button>
          <button onClick={()=>setAc(!ac)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{background:C.ink}}><Plus size={16}/> Ürün Ekle</button>
        </div>
      </div>
      {buyuk&&(<Modal genis title={buyuk.ad} onClose={()=>setBuyuk(null)}>
        <img src={buyuk.foto} alt="" className="w-full rounded-xl object-contain" style={{maxHeight:"75vh",background:C.paper}}/>
        <div className="mt-3 text-sm" style={{color:C.inkSoft}}>{buyuk.kod}{buyuk.renk?` \u00b7 ${buyuk.renk}`:""} \u00b7 stok {sayi(buyuk.stok)} {buyuk.birim} \u00b7 <b style={{color:C.gelir}}>{tl(buyuk.satis)}</b></div>
      </Modal>)}
      {etiketAc&&(<Modal title="QR Etiket Yazdır" onClose={()=>setEtiketAc(false)}>
        <p className="text-sm mb-3" style={{color:C.inkSoft}}>Etiketini basmak istediğin ürünleri seç, kaç adet basılacağını yaz. Her etikette QR kod, ürün adı, kod/renk ve fiyat olur.</p>
        <div className="flex gap-2 mb-3">
          <button onClick={()=>setSec(Object.fromEntries(products.map(p=>[p.id,"1"])))} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Tümünü seç</button>
          <button onClick={()=>setSec({})} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Temizle</button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border" style={{borderColor:C.hair}}>
          {products.map(p=>{const secili=sec[p.id]!=null; return(
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0" style={{borderColor:C.hair}}>
              <input type="checkbox" checked={secili} onChange={e=>{const n={...sec}; if(e.target.checked) n[p.id]="1"; else delete n[p.id]; setSec(n);}}/>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{p.ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{p.kod}{p.renk?` · ${p.renk}`:""} · {tl(p.satis)}</div></div>
              {secili&&<input value={sec[p.id]} onChange={e=>setSec({...sec,[p.id]:fmtInput(e.target.value)})} inputMode="numeric" className="w-16 rounded-lg px-2 py-1 text-sm text-right tabular-nums outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>}
            </div>);})}
          {products.length===0&&<div className="px-3 py-4 text-sm" style={{color:C.inkSoft}}>Ürün yok.</div>}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={()=>setEtiketAc(false)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Vazgeç</button>
          <button onClick={etiketYaz} disabled={yaz} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:yaz?C.inkSoft:C.gelir}}>{yaz?<Loader2 size={15} className="animate-spin"/>:<Printer size={15}/>} {yaz?"Hazırlanıyor…":"Yazdır"}</button>
        </div>
      </Modal>)}
      {ac&&(<div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
        {FormGrid(f,setF)}
        <div className="flex justify-end mt-3"><button onClick={ekle} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button></div>
      </div>)}
      <div className="relative max-w-xs"><Search size={15} color={C.inkSoft} className="absolute left-3 top-1/2 -translate-y-1/2"/>
        <input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Ürün ara..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
      <Tablo><thead><Tr head><Th>Ürün</Th><Th>Kategori</Th><Th r>Stok</Th><Th r>Giriş</Th><Th r>Satış</Th><Th r>Birim Kâr</Th><Th r>Marj</Th><Th></Th></Tr></thead><tbody>
        {goster.map(s=>{const dusuk=kritikMi(s),kar=N(s.satis)-N(s.giris),marj=N(s.satis)?Math.round(kar/N(s.satis)*100):0;
          const gun=s.created_at?Math.floor((Date.now()-new Date(s.created_at).getTime())/86400000):null;
          const gToplam=N(s.stok)*N(s.giris), sToplam=N(s.stok)*N(s.satis), kToplam=N(s.stok)*kar; return(
          <Tr key={s.id}>
            <Td><div className="flex items-start gap-2.5">
              {s.foto
                ? <img src={s.foto} alt="" onClick={()=>setBuyuk(s)} className="h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-lg object-cover cursor-zoom-in shrink-0 transition-transform hover:scale-[1.03]" style={{border:`1px solid ${C.hair}`}} title="Büyütmek için tıkla"/>
                : <div className="flex h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24 items-center justify-center rounded-lg shrink-0" style={{border:`1px dashed ${C.hair}`,background:C.paper}}><ImageIcon size={20} color={C.inkSoft}/></div>}
              <div className="min-w-0"><div className="font-medium">{s.ad}</div><div className="text-xs" style={{color:C.inkSoft}}>{s.kod}{s.renk?` · ${s.renk}`:""}</div>{s.created_at&&<div className="text-xs" style={{color:C.inkSoft}}>eklendi {fTarih(s.created_at.slice(0,10))}{gun!=null&&` · ${gun<=0?"bugün":gun+" gün önce"}`}</div>}</div></div></Td>
            <Td><Rozet renk={C.gold} bg={C.goldBg}>{s.kategori}</Rozet></Td>
            <Td r><span className="tabular-nums font-semibold" style={{color:dusuk?C.gider:C.ink}}>{sayi(s.stok)} {s.birim}</span>{dusuk&&<div className="text-xs" style={{color:C.gider}}>kritik</div>}</Td>
            <Td r mono>{tl(s.giris)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(N(s.giris),kur)}</div><div className="text-xs font-semibold" style={{color:C.gold}}>toplam {tl(gToplam)}</div><div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(gToplam,kur)}</div></Td>
            <Td r mono>{tl(s.satis)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(N(s.satis),kur)}</div><div className="text-xs font-semibold" style={{color:C.gold}}>toplam {tl(sToplam)}</div><div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(sToplam,kur)}</div></Td>
            <Td r mono><div className="font-medium" style={{color:kar>=0?C.gelir:C.gider}}>{tl(kar)}</div><div className="text-xs" style={{color:C.inkSoft}}>{dov(kar,kur)}</div><div className="text-xs font-semibold" style={{color:kToplam>=0?C.gelir:C.gider}}>toplam {tl(kToplam)}</div><div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(kToplam,kur)}</div></Td>
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
function Musteriler({customers,sales,collections,orders=[],products=[],musteriAlacak,kur,A,canDelete}){
  const [ac,setAc]=useState(false);
  const [ny,setNy]=useState({ad:"",telefon:"",adres:"",vergi_no:"",notu:"",acilis:""});
  const [th,setTh]=useState({musteriId:"",tutar:"",pb:"TL",tarih:TODAY}); const [detay,setDetay]=useState(null);
  const [sip,setSip]=useState({aciklama:"",toplam:"",kapora:"",notu:"",teslim:""});
  const [iade,setIade]=useState({urunId:"",adet:"",tutar:"",tur:"hesap",tarih:TODAY,aciklama:""});
  const iadeYap=async()=>{ if(!detay) return; const tutar=parse(iade.tutar),adet=parse(iade.adet);
    const urun=products.find(p=>p.id===iade.urunId)||null;
    const efTutar = tutar>0 ? tutar : (urun? adet*N(urun.satis):0);
    if(efTutar<=0 && !(urun&&adet>0)) return;
    await A.customerReturn({musteriId:detay.id,urunId:urun?.id||null,adet,tutar:efTutar,tur:iade.tur,tarih:iade.tarih,aciklama:iade.aciklama.trim()});
    setIade({urunId:"",adet:"",tutar:"",tur:iade.tur,tarih:iade.tarih,aciklama:""}); };
  const sipEkle=async()=>{ if(!detay) return; const toplam=parse(sip.toplam), kapora=parse(sip.kapora);
    if(!sip.aciklama.trim()&&toplam<=0) return;
    await A.addOrder({musteri_id:detay.id,musteri_ad:detay.ad,aciklama:sip.aciklama.trim(),toplam,kapora,notu:sip.notu.trim(),teslim:sip.teslim||null,tarih:TODAY});
    setSip({aciklama:"",toplam:"",kapora:"",notu:"",teslim:""}); };
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
          <option value="">Seçin...</option>{customers.filter(m=>N(m.bakiye)>0).map(m=><option key={m.id} value={m.id}>{m.ad} — {tl(m.bakiye)} ({dov(N(m.bakiye),kur)})</option>)}</select></div>
        <div className="min-w-[180px]"><Lbl>Tutar</Lbl>
          {(()=>{
            const thPb=th.pb||"TL"; const thCarpan=thPb==="USD"?kur.usd:thPb==="EUR"?kur.eur:1; const thTL=parse(th.tutar)*thCarpan;
            return (<>
              <div className="flex gap-1.5">
                <select value={thPb} onChange={e=>setTh({...th,pb:e.target.value})} className="rounded-lg px-2 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${thPb!=="TL"?C.gold:C.hair}`,background:C.paper,color:thPb!=="TL"?C.gold:C.ink}}><option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option></select>
                <input value={th.tutar} onChange={e=>setTh({...th,tutar:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
              </div>
              {thPb!=="TL"&&thTL>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(thTL)} tahsil</div>}
            </>);
          })()}
        </div>
        <div className="min-w-[150px]"><Lbl>Tarih</Lbl><input type="date" value={th.tarih} onChange={e=>setTh({...th,tarih:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
        <button onClick={async()=>{const c=th.pb==="USD"?kur.usd:th.pb==="EUR"?kur.eur:1; await A.collect(th.musteriId,parse(th.tutar)*c,th.tarih); setTh({musteriId:"",tutar:"",pb:th.pb,tarih:th.tarih});}} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Tahsil Et</button>
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
          <button onClick={()=>hesapOzetiYazdir(detay,sales,collections)} className="ml-auto self-start flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.ink}}><Printer size={15}/> Hesap Özeti Yazdır</button>
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
          <Td r mono bold>{tl(s.tutar)}<div className="text-xs font-normal tabular-nums" style={{color:C.inkSoft}}>{dov(s.tutar,kur)}</div></Td><Td><OdemeRozet odeme={s.odeme}/></Td>
          <Td><button onClick={()=>fisYazdir(s)} className="p-1.5 rounded" title="Fiş yazdır"><Printer size={14} color={C.inkSoft}/></button></Td>
        </Tr>);})}{sales.filter(s=>s.musteri_id===detay.id).length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Henüz mal alımı yok.</span></Td></Tr>}</tbody></Tablo>
        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{color:C.inkSoft}}>Tahsilatlar</h4>
        <Tablo bare><tbody>{collections.filter(t=>t.musteri_id===detay.id).map(t=>(<Tr key={t.id}>
          <Td><span className="text-xs tabular-nums" style={{color:C.inkSoft}}>{fTarih(t.tarih)}</span></Td><Td>Tahsilat</Td><Td r mono bold style={{color:C.gelir}}>{tl(t.tutar)}<div className="text-xs font-normal tabular-nums" style={{color:C.inkSoft}}>{dov(t.tutar,kur)}</div></Td>
        </Tr>))}{collections.filter(t=>t.musteri_id===detay.id).length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Tahsilat yok.</span></Td></Tr>}</tbody></Tablo>

        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{color:C.inkSoft}}>İade Al</h4>
        <div className="rounded-lg border p-3 mb-3" style={{borderColor:C.hair,background:C.paper}}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2"><Lbl>Ürün (ops. — seçilirse stoğa geri eklenir)</Lbl><select value={iade.urunId} onChange={e=>setIade({...iade,urunId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}><option value="">Ürünsüz (sadece tutar)…</option>{products.map(p=><option key={p.id} value={p.id}>{p.ad}</option>)}</select></div>
            <div><Lbl>Adet (ops.)</Lbl><input value={iade.adet} onChange={e=>setIade({...iade,adet:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
            <div><Lbl>İade Tutarı ₺</Lbl><input value={iade.tutar} onChange={e=>setIade({...iade,tutar:fmtInput(e.target.value)})} inputMode="decimal" placeholder={(()=>{const u=products.find(p=>p.id===iade.urunId);const a=parse(iade.adet);return u&&a>0?tl(a*N(u.satis)):"";})()} className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
            <div className="col-span-2"><Lbl>İade Türü</Lbl><div className="flex gap-1.5">
              {[["hesap","Hesaptan düş (borcu azalır)"],["nakit","Nakit iade (kasadan çıkar)"]].map(([k,l])=>{const a=iade.tur===k;return(
                <button key={k} onClick={()=>setIade({...iade,tur:k})} className="flex-1 rounded-lg py-2 text-xs font-medium" style={{background:a?C.ink:"transparent",color:a?"#fff":C.inkSoft,border:`1px solid ${a?C.ink:C.hair}`}}>{l}</button>);})}
            </div></div>
            <div><Lbl>Tarih</Lbl><input type="date" value={iade.tarih} onChange={e=>setIade({...iade,tarih:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
            <div><Lbl>Açıklama (ops.)</Lbl><input value={iade.aciklama} onChange={e=>setIade({...iade,aciklama:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
          </div>
          <div className="flex justify-end mt-2"><button onClick={iadeYap} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gider}}>İade Al</button></div>
        </div>

        <h4 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{color:C.inkSoft}}>Siparişler</h4>
        <div className="rounded-lg border p-3 mb-3" style={{borderColor:C.hair,background:C.paper}}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2"><Lbl>Açıklama (her satıra bir kalem)</Lbl><textarea value={sip.aciklama} onChange={e=>setSip({...sip,aciklama:e.target.value})} rows={3} placeholder={"ör.\n500 adet dalgıç takım kırmızı/siyah/mavi\n500 tişört\n500 kapri"} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
            <div><Lbl>Toplam Tutar ₺</Lbl><input value={sip.toplam} onChange={e=>setSip({...sip,toplam:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
            <div><Lbl>Kapora ₺</Lbl>
              <div className="flex gap-1.5">
                <input value={sip.kapora} onChange={e=>setSip({...sip,kapora:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.surface}}/>
                <button onClick={()=>setSip({...sip,kapora:fmtInput(String(Math.round(parse(sip.toplam)*10)/100).replace(".",","))})} title="Toplamın %10'u" className="whitespace-nowrap rounded-lg px-2 text-xs font-semibold" style={{border:`1px solid ${C.gold}`,color:C.gold}}>%10</button>
              </div>
            </div>
            <div><Lbl>Teslim Tarihi (ops.)</Lbl><input type="date" value={sip.teslim} onChange={e=>setSip({...sip,teslim:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
            <div><Lbl>Not (ops.)</Lbl><input value={sip.notu} onChange={e=>setSip({...sip,notu:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.surface}}/></div>
          </div>
          {parse(sip.toplam)>0&&<div className="text-xs tabular-nums mt-2" style={{color:C.inkSoft}}>Kalan (teslimde): <b style={{color:C.ink}}>{tl(parse(sip.toplam)-parse(sip.kapora))}</b>{parse(sip.kapora)>0?` · kapora ${tl(parse(sip.kapora))} kasaya girer`:""}</div>}
          <div className="flex justify-end mt-2"><button onClick={sipEkle} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Sipariş Ekle</button></div>
        </div>
        <Tablo bare><tbody>{orders.filter(o=>o.musteri_id===detay.id).map(o=>(<Tr key={o.id}>
          <Td><div className="font-medium whitespace-pre-line">{o.aciklama||"Sipariş"}</div><div className="text-xs" style={{color:C.inkSoft}}>{fTarih(o.tarih)}{o.teslim?` · teslim ${fTarih(o.teslim)}`:""}{o.notu?` · ${o.notu}`:""}</div></Td>
          <Td r mono><div className="font-semibold">{tl(o.toplam)}</div><div className="text-xs font-normal" style={{color:C.inkSoft}}>kapora {tl(o.kapora)} · kalan {tl(N(o.toplam)-N(o.kapora))}</div></Td>
          <Td><Rozet renk={o.durum==="Teslim Edildi"?C.gelir:o.durum==="İptal"?C.gider:C.gold} bg={o.durum==="Teslim Edildi"?C.gelirBg:o.durum==="İptal"?C.giderBg:C.goldBg}>{o.durum}</Rozet></Td>
        </Tr>))}{orders.filter(o=>o.musteri_id===detay.id).length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Sipariş yok.</span></Td></Tr>}</tbody></Tablo>
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
  const [mg,setMg]=useState({tedId:"",is:"",adet:"",olcu:kumasci?"metre":"adet",birim:"",pb:"TL",tutar:"",odeme:"veresiye",tarih:TODAY}); const [od,setOd]=useState({tedId:"",tutar:"",pb:"TL",not:"",tarih:TODAY});
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
            const pb=mg.pb||"TL"; const sym={TL:"₺",USD:"$",EUR:"€"};
            const adetN=parse(mg.adet), birimGiris=parse(mg.birim);
            const birimTL = pb==="USD" ? birimGiris*kur.usd : pb==="EUR" ? birimGiris*kur.eur : birimGiris;
            const otoTutar=(adetN>0&&birimTL>0)?adetN*birimTL:0;
            const efTutar=otoTutar>0?otoTutar:parse(mg.tutar);
            const olcu=mg.olcu||"adet";
            const acikla=()=>{ let s=mg.is.trim()||"Mal girişi";
              if(adetN>0&&birimGiris>0){ s+=` · ${sayi(adetN)} ${olcu} × ${sym[pb]}${mg.birim}`; if(pb!=="TL") s+=` (≈₺${d2(birimTL)})`; }
              else if(adetN>0) s+=` · ${sayi(adetN)} ${olcu}`;
              return s; };
            const kaydet=async()=>{ if(!mg.tedId||efTutar<=0) return; await A.purchase(mg.tedId,acikla(),efTutar,mg.odeme,mg.tarih); setMg({tedId:"",is:"",adet:"",olcu:mg.olcu,birim:"",pb:mg.pb,tutar:"",odeme:mg.odeme,tarih:mg.tarih}); };
            return (<>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Lbl>{etiket}</Lbl><select value={mg.tedId} onChange={e=>setMg({...mg,tedId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="">Seçin...</option>{grupListe.map(t=><option key={t.id} value={t.id}>{t.ad}{kumasci?"":` · ${t.tur||"Diğer"}`}</option>)}</select></div>
                <div className="col-span-2"><Lbl>İş / Ürün (ne için?)</Lbl><input value={mg.is} onChange={e=>setMg({...mg,is:e.target.value})} placeholder="ör. Tişört dikimi, kumaş baskı, fason dikim" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
                <div><Lbl>Miktar (ops.)</Lbl>
                  <div className="flex gap-1.5">
                    <select value={olcu} onChange={e=>setMg({...mg,olcu:e.target.value})} className="rounded-lg px-2 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}>{["metre","kilo","adet","top","paket"].map(o=><option key={o} value={o}>{o}</option>)}</select>
                    <input value={mg.adet} onChange={e=>setMg({...mg,adet:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
                  </div>
                </div>
                <div>
                  <Lbl>Birim Fiyat ({olcu} başı, ops.)</Lbl>
                  <div className="flex gap-1.5">
                    <select value={pb} onChange={e=>setMg({...mg,pb:e.target.value})} className="rounded-lg px-2 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${pb!=="TL"?C.gold:C.hair}`,background:C.paper,color:pb!=="TL"?C.gold:C.ink}}>
                      <option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option>
                    </select>
                    <input value={mg.birim} onChange={e=>setMg({...mg,birim:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
                  </div>
                  {pb!=="TL"&&birimTL>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>birim ≈ ₺{d2(birimTL)}</div>}
                </div>
                <div>
                  <Lbl>{otoTutar>0?"Tutar ₺ (otomatik)":"Tutar ₺"}</Lbl>
                  {otoTutar>0
                    ? <div className="w-full rounded-lg px-3 py-2 text-sm tabular-nums font-semibold" style={{border:`1px solid ${C.hair}`,background:C.paper,color:C.ink}}>{tl(otoTutar)}</div>
                    : <input value={mg.tutar} onChange={e=>setMg({...mg,tutar:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>}
                  {efTutar>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ {dov(efTutar,kur)}</div>}
                </div>
                <div><Lbl>Ödeme</Lbl><select value={mg.odeme} onChange={e=>setMg({...mg,odeme:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="veresiye">Veresiye</option><option value="peşin">Peşin</option></select></div>
                <div className="col-span-2"><Lbl>Tarih</Lbl><input type="date" value={mg.tarih} onChange={e=>setMg({...mg,tarih:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
              </div>
              {(mg.is.trim()||adetN>0)&&<div className="mt-2 text-xs rounded-lg px-3 py-2" style={{background:C.paper,color:C.inkSoft}}>Kayda geçecek: <b style={{color:C.ink}}>{acikla()}</b></div>}
              <button onClick={kaydet} disabled={!mg.tedId||efTutar<=0} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50" style={{background:C.ink}}>Mal Girişi Kaydet</button>
            </>);
          })()}
        </div>
        <div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:C.inkSoft}}>Borç Ödeme</h3>
          {(()=>{
            const odPb=od.pb||"TL"; const sym={TL:"₺",USD:"$",EUR:"€"};
            const odCarpan = odPb==="USD"?kur.usd : odPb==="EUR"?kur.eur : 1;
            const odTL = parse(od.tutar)*odCarpan;
            const acikla=()=>{ let s=(od.not||"").trim()||"Ödeme"; if(odPb!=="TL") s+=` · ${sym[odPb]}${od.tutar} (≈₺${d2(odTL)})`; return s; };
            const ode=async()=>{ if(!od.tedId||odTL<=0) return; await A.pay(od.tedId,odTL,acikla(),od.tarih); setOd({tedId:"",tutar:"",pb:od.pb,not:"",tarih:od.tarih}); };
            return (<>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Lbl>{etiket}</Lbl><select value={od.tedId} onChange={e=>setOd({...od,tedId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="">Seçin...</option>{grupListe.filter(t=>N(t.bakiye)>0).map(t=><option key={t.id} value={t.id}>{t.ad} — {tl(t.bakiye)} ({dov(N(t.bakiye),kur)})</option>)}</select></div>
                <div className="col-span-2"><Lbl>Açıklama / Not (ops.)</Lbl><input value={od.not||""} onChange={e=>setOd({...od,not:e.target.value})} placeholder="ör. Triko kumaş ödemesi" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
                <div className="col-span-2"><Lbl>Tutar</Lbl>
                  <div className="flex gap-1.5">
                    <select value={odPb} onChange={e=>setOd({...od,pb:e.target.value})} className="rounded-lg px-2 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${odPb!=="TL"?C.gold:C.hair}`,background:C.paper,color:odPb!=="TL"?C.gold:C.ink}}><option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option></select>
                    <input value={od.tutar} onChange={e=>setOd({...od,tutar:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
                  </div>
                  {odPb!=="TL"&&odTL>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(odTL)} ödenecek</div>}
                </div>
                <div className="col-span-2"><Lbl>Tarih</Lbl><input type="date" value={od.tarih} onChange={e=>setOd({...od,tarih:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
              </div>
              {(od.tutar&&odTL>0)&&<div className="mt-2 text-xs rounded-lg px-3 py-2" style={{background:C.paper,color:C.inkSoft}}>Kayda geçecek: <b style={{color:C.ink}}>{acikla()}</b></div>}
              <button onClick={ode} disabled={!od.tedId||odTL<=0} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50" style={{background:C.gelir}}>Ödeme Yap</button>
            </>);
          })()}
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
  const [f,setF]=useState({tip:"alinan",tur:"Çek",kisi:"",banka:"",tutar:"",pb:"TL",vade:TODAY,notu:""}); const [filtre,setFiltre]=useState("hepsi");
  const [duzenle,setDuzenle]=useState(null);
  const toTr=(n)=>String(Math.round(Number(n)*100)/100).replace(".",",");
  const duzenleAc=(c)=>setDuzenle({id:c.id,tip:c.tip,tur:c.tur,kisi:c.kisi,banka:c.banka==="—"?"":c.banka,pb:"TL",tutar:fmtInput(toTr(c.tutar)),vade:c.vade,notu:c.notu||""});
  const duzenleKaydet=async()=>{ const d=duzenle; if(!d.kisi.trim()||parse(d.tutar)<=0)return;
    const c=d.pb==="USD"?kur.usd:d.pb==="EUR"?kur.eur:1; const tutarTL=parse(d.tutar)*c;
    await A.updateCheque(d.id,{tip:d.tip,tur:d.tur,kisi:d.kisi.trim(),banka:d.banka||"—",tutar:tutarTL,vade:d.vade,notu:d.notu||""});
    setDuzenle(null); };
  const DURUMLAR={alinan:["Portföyde","Tahsil Edildi","Ciro Edildi","Karşılıksız"],verilen:["Beklemede","Ödendi","Karşılıksız"]};
  const dR=(d)=>({"Portföyde":C.gold,"Beklemede":C.gold,"Tahsil Edildi":C.gelir,"Ödendi":C.gelir,"Ciro Edildi":C.inkSoft,"Karşılıksız":C.gider}[d]||C.inkSoft);
  const dB=(d)=>({"Portföyde":C.goldBg,"Beklemede":C.goldBg,"Tahsil Edildi":C.gelirBg,"Ödendi":C.gelirBg,"Ciro Edildi":C.hair,"Karşılıksız":C.giderBg}[d]||C.hair);
  const kisiler=f.tip==="alinan"?customers:suppliers;
  const ekle=async()=>{ if(!f.kisi.trim()||parse(f.tutar)<=0)return;
    const c=f.pb==="USD"?kur.usd:f.pb==="EUR"?kur.eur:1; const tutarTL=parse(f.tutar)*c;
    let notu=f.notu||""; if(f.pb!=="TL"){ const sym={TL:"₺",USD:"$",EUR:"€"}; const dn=`${sym[f.pb]}${f.tutar}`; notu=notu?`${notu} · ${dn}`:dn; }
    await A.addCheque({tip:f.tip,tur:f.tur,kisi:f.kisi.trim(),banka:f.banka||"—",tutar:tutarTL,vade:f.vade,durum:f.tip==="alinan"?"Portföyde":"Beklemede",notu,islendi:false}); setF({tip:f.tip,tur:"Çek",kisi:"",banka:"",tutar:"",pb:f.pb,vade:TODAY,notu:""}); setAc(false); };
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
          <Inp label="Banka" v={f.banka} set={v=>setF({...f,banka:v})}/>
          <div><Lbl>Tutar</Lbl>
            <div className="flex gap-1.5">
              <select value={f.pb||"TL"} onChange={e=>setF({...f,pb:e.target.value})} className="rounded-lg px-2 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${(f.pb&&f.pb!=="TL")?C.gold:C.hair}`,background:C.paper,color:(f.pb&&f.pb!=="TL")?C.gold:C.ink}}><option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option></select>
              <input value={f.tutar} onChange={e=>setF({...f,tutar:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
            </div>
            {f.pb&&f.pb!=="TL"&&parse(f.tutar)>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(parse(f.tutar)*(f.pb==="USD"?kur.usd:kur.eur))}</div>}
          </div>
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
            <Td><div className="flex items-center justify-end gap-1">
              <button onClick={()=>duzenleAc(c)} className="p-1.5 rounded" title="Düzenle"><Pencil size={15} color={C.inkSoft}/></button>
              {canDelete&&<SilBtn onClick={()=>A.deleteCheque(c.id)}/>}
            </div></Td>
          </Tr>);})}
        {goster.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Kayıt yok.</span></Td></Tr>}
      </tbody></Tablo>
      {duzenle&&(<Modal title="Çek / Senet Düzenle" onClose={()=>setDuzenle(null)}>
        <div className="flex flex-wrap gap-2 mb-3">{[["alinan","Alınan (bana verilen)"],["verilen","Verilen (benim yazdığım)"]].map(([k,l])=>{const a=duzenle.tip===k;return(
          <button key={k} onClick={()=>setDuzenle({...duzenle,tip:k})} className="rounded-lg px-3 py-2 text-sm font-medium" style={{background:a?C.ink:"transparent",color:a?"#fff":C.inkSoft,border:`1px solid ${a?C.ink:C.hair}`}}>{l}</button>);})}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>Tür</Lbl><select value={duzenle.tur} onChange={e=>setDuzenle({...duzenle,tur:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option>Çek</option><option>Senet</option></select></div>
          <div><Lbl>{duzenle.tip==="alinan"?"Kimden":"Kime"}</Lbl><input list="cek-kisi-d" value={duzenle.kisi} onChange={e=>setDuzenle({...duzenle,kisi:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/><datalist id="cek-kisi-d">{(duzenle.tip==="alinan"?customers:suppliers).map(k=><option key={k.id} value={k.ad}/>)}</datalist></div>
          <div><Lbl>Banka</Lbl><input value={duzenle.banka} onChange={e=>setDuzenle({...duzenle,banka:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Tutar</Lbl>
            <div className="flex gap-1.5">
              <select value={duzenle.pb} onChange={e=>setDuzenle({...duzenle,pb:e.target.value})} className="rounded-lg px-2 py-2 text-sm font-semibold outline-none" style={{border:`1px solid ${duzenle.pb!=="TL"?C.gold:C.hair}`,background:C.paper,color:duzenle.pb!=="TL"?C.gold:C.ink}}><option value="TL">₺</option><option value="USD">$</option><option value="EUR">€</option></select>
              <input value={duzenle.tutar} onChange={e=>setDuzenle({...duzenle,tutar:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
            </div>
            {duzenle.pb!=="TL"&&parse(duzenle.tutar)>0&&<div className="text-xs tabular-nums mt-1" style={{color:C.inkSoft}}>≈ ₺{d2(parse(duzenle.tutar)*(duzenle.pb==="USD"?kur.usd:kur.eur))}</div>}
          </div>
          <div><Lbl>Vade</Lbl><input type="date" value={duzenle.vade} onChange={e=>setDuzenle({...duzenle,vade:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div className="col-span-2"><Lbl>Açıklama</Lbl><input value={duzenle.notu} onChange={e=>setDuzenle({...duzenle,notu:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={()=>setDuzenle(null)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Vazgeç</button>
          <button onClick={duzenleKaydet} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Güncelle</button>
        </div>
      </Modal>)}
    </div>
  );
}

// === SİPARİŞLER =============================================================
function Siparisler({orders=[],customers,kur,A,canDelete,rol}){
  const DURUMLAR=["Bekliyor","Hazırlanıyor","Hazır","Teslim Edildi","İptal"];
  const dRenk=(d)=>d==="Teslim Edildi"?C.gelir:d==="İptal"?C.gider:d==="Hazır"?C.gelir:C.gold;
  const dBg=(d)=>d==="Teslim Edildi"?C.gelirBg:d==="İptal"?C.giderBg:d==="Hazır"?C.gelirBg:C.goldBg;
  const [ac,setAc]=useState(false);
  const [f,setF]=useState({musteriId:"",aciklama:"",toplam:"",kapora:"",notu:"",teslim:""});
  const [filtre,setFiltre]=useState("acik");
  const ekle=async()=>{ const toplam=parse(f.toplam),kapora=parse(f.kapora); if(!f.aciklama.trim()&&toplam<=0) return;
    const m=customers.find(c=>c.id===f.musteriId)||null;
    await A.addOrder({musteri_id:m?.id||null,musteri_ad:m?.ad||"",aciklama:f.aciklama.trim(),toplam,kapora,notu:f.notu.trim(),teslim:f.teslim||null,tarih:TODAY});
    setF({musteriId:f.musteriId,aciklama:"",toplam:"",kapora:"",notu:"",teslim:""}); setAc(false); };
  const goster=[...orders].filter(o=>filtre==="hepsi"?true:filtre==="acik"?(o.durum!=="Teslim Edildi"&&o.durum!=="İptal"):o.durum===filtre).sort((a,b)=>((a.teslim||a.tarih)>(b.teslim||b.tarih)?1:-1));
  const acikTutar=orders.filter(o=>o.durum!=="Teslim Edildi"&&o.durum!=="İptal").reduce((a,b)=>a+(N(b.toplam)-N(b.kapora)),0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Ozetcik etiket="Açık sipariş kalanı" deger={tl(acikTutar)} dov={dov(acikTutar,kur)} renk={C.gold} alt={`${orders.filter(o=>o.durum!=="Teslim Edildi"&&o.durum!=="İptal").length} açık sipariş`}/>
        <button onClick={()=>setAc(!ac)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{background:C.ink}}><Plus size={16}/> Sipariş Ekle</button>
      </div>
      {ac&&(<div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2"><Lbl>Müşteri</Lbl><select value={f.musteriId} onChange={e=>setF({...f,musteriId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="">Seçin (ops.)…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.ad}</option>)}</select></div>
          <div className="col-span-2"><Lbl>Açıklama (her satıra bir kalem)</Lbl><textarea value={f.aciklama} onChange={e=>setF({...f,aciklama:e.target.value})} rows={3} placeholder={"ör.\n500 adet dalgıç takım kırmızı/siyah/mavi\n500 tişört\n500 kapri"} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Toplam ₺</Lbl><input value={f.toplam} onChange={e=>setF({...f,toplam:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Kapora ₺</Lbl><div className="flex gap-1.5">
            <input value={f.kapora} onChange={e=>setF({...f,kapora:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
            <button onClick={()=>setF({...f,kapora:fmtInput(String(Math.round(parse(f.toplam)*10)/100).replace(".",","))})} title="Toplamın %10'u" className="whitespace-nowrap rounded-lg px-2 text-xs font-semibold" style={{border:`1px solid ${C.gold}`,color:C.gold}}>%10</button></div></div>
          <div><Lbl>Teslim (ops.)</Lbl><input type="date" value={f.teslim} onChange={e=>setF({...f,teslim:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Not (ops.)</Lbl><input value={f.notu} onChange={e=>setF({...f,notu:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
        </div>
        {parse(f.toplam)>0&&<div className="text-xs tabular-nums mt-2" style={{color:C.inkSoft}}>Kalan: <b style={{color:C.ink}}>{tl(parse(f.toplam)-parse(f.kapora))}</b>{parse(f.kapora)>0?` · kapora ${tl(parse(f.kapora))} kasaya girer`:""}</div>}
        <div className="flex justify-end mt-3"><button onClick={ekle} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Kaydet</button></div>
      </div>)}
      <div className="flex gap-1.5 flex-wrap">{[["acik","Açık"],["hepsi","Hepsi"],["Bekliyor","Bekliyor"],["Hazırlanıyor","Hazırlanıyor"],["Hazır","Hazır"],["Teslim Edildi","Teslim"]].map(([k,l])=>(
        <button key={k} onClick={()=>setFiltre(k)} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{background:filtre===k?C.ink:"transparent",color:filtre===k?"#fff":C.inkSoft,border:`1px solid ${filtre===k?C.ink:C.hair}`}}>{l}</button>))}</div>
      <Tablo><thead><Tr head><Th>Sipariş</Th><Th>Müşteri</Th><Th r>Tutar</Th><Th>Durum</Th><Th></Th></Tr></thead><tbody>
        {goster.map(o=>{const gec=o.teslim&&o.teslim<TODAY&&o.durum!=="Teslim Edildi"&&o.durum!=="İptal"; return(
          <Tr key={o.id}>
            <Td><div className="font-medium whitespace-pre-line">{o.aciklama||"Sipariş"}</div><div className="text-xs" style={{color:gec?C.gider:C.inkSoft}}>{fTarih(o.tarih)}{o.teslim?` · teslim ${fTarih(o.teslim)}${gec?" (geçti)":""}`:""}{o.notu?` · ${o.notu}`:""}</div></Td>
            <Td><span style={{color:C.inkSoft}}>{o.musteri_ad||"—"}</span></Td>
            <Td r mono><div className="font-semibold">{tl(o.toplam)}</div><div className="text-xs font-normal" style={{color:C.inkSoft}}>kapora {tl(o.kapora)} · kalan {tl(N(o.toplam)-N(o.kapora))}</div></Td>
            <Td><select value={o.durum} onChange={e=>A.updateOrder(o.id,{durum:e.target.value})} className="rounded px-2 py-1 text-xs font-medium outline-none" style={{background:dBg(o.durum),color:dRenk(o.durum),border:"none"}}>{DURUMLAR.map(d=><option key={d}>{d}</option>)}</select></Td>
            <Td>{canDelete&&<SilBtn onClick={()=>A.deleteOrder(o.id)}/>}</Td>
          </Tr>);})}
        {goster.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Sipariş yok.</span></Td></Tr>}
      </tbody></Tablo>
    </div>
  );
}

// === GİDER (kasadan anlık çıkışlar) ========================================
function Gider({giderler=[],toplamGider,kur,A,canDelete}){
  const [f,setF]=useState({aciklama:"",tutar:"",tarih:TODAY});
  const ekle=async()=>{ const tutar=parse(f.tutar); if(tutar<=0) return; await A.addExpense({aciklama:f.aciklama.trim()||"Gider",amount:tutar,tarih:f.tarih}); setF({aciklama:"",tutar:"",tarih:f.tarih}); };
  const HIZLI=["Benzin","Yemek","Kira","Fatura","Nakliye","Personel"];
  const ayG={}; giderler.forEach(g=>{const a=(g.tarih||(g.created_at||"")).slice(0,7); if(!a)return; ayG[a]=(ayG[a]||0)+N(g.amount);});
  const ayListe=Object.entries(ayG).sort((a,b)=>a[0]<b[0]?1:-1);
  const ayAdi=(a)=>{const [y,m]=a.split("-"); return `${AYLAR[Number(m)-1]} ${y}`;};
  return (
    <div className="space-y-4">
      <Ozetcik etiket="Toplam Gider" deger={tl(toplamGider)} dov={dov(toplamGider,kur)} renk={C.gider} alt={`${giderler.length} kayıt · kasadan çıktı`}/>
      <div className="rounded-xl border p-4" style={{background:C.surface,borderColor:C.hair}}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3" style={{color:C.inkSoft}}><Wallet size={15}/> Gider Ekle</h2>
        <div className="flex flex-wrap gap-1.5 mb-3">{HIZLI.map(h=>(
          <button key={h} onClick={()=>setF({...f,aciklama:h})} className="rounded-full px-3 py-1 text-xs font-medium" style={{background:f.aciklama===h?C.ink:"transparent",color:f.aciklama===h?"#fff":C.inkSoft,border:`1px solid ${f.aciklama===h?C.ink:C.hair}`}}>{h}</button>))}</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2"><Lbl>Açıklama</Lbl><input value={f.aciklama} onChange={e=>setF({...f,aciklama:e.target.value})} placeholder="ör. benzin, yemek, nakliye" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Tutar ₺</Lbl><input value={f.tutar} onChange={e=>setF({...f,tutar:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
          <div><Lbl>Tarih</Lbl><div className="flex gap-1.5">
            <input type="date" value={f.tarih} onChange={e=>setF({...f,tarih:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}/>
            <button onClick={ekle} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gider}}>Ekle</button></div></div>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{background:C.surface,borderColor:C.hair}}>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider px-4 pt-4 pb-2" style={{color:C.inkSoft}}><CalendarClock size={14}/> Aylık Masraf</h3>
        <Tablo bare><thead><Tr head><Th>Ay</Th><Th r>Masraf ₺</Th><Th r>$</Th><Th r>€</Th></Tr></thead><tbody>
          {ayListe.map(([a,t])=>(<Tr key={a}>
            <Td><span className="font-medium">{ayAdi(a)}</span></Td>
            <Td r mono bold style={{color:C.gider}}>−{tl(t)}</Td>
            <Td r mono style={{color:C.inkSoft}}>${d2(t/kur.usd)}</Td>
            <Td r mono style={{color:C.inkSoft}}>€{d2(t/kur.eur)}</Td>
          </Tr>))}
          {ayListe.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Kayıt yok.</span></Td></Tr>}
        </tbody></Tablo>
      </div>
      <Tablo><thead><Tr head><Th>Tarih</Th><Th>Açıklama</Th><Th r>Tutar</Th><Th></Th></Tr></thead><tbody>
        {giderler.map(g=>(<Tr key={g.id}>
          <Td><span className="tabular-nums" style={{color:C.inkSoft}}>{fTarih(g.tarih||(g.created_at||"").slice(0,10))}</span></Td>
          <Td>{String(g.aciklama||"").replace(/^\[Gider\]\s*/,"")}</Td>
          <Td r mono bold style={{color:C.gider}}>−{tl(g.amount)}<div className="text-xs font-normal" style={{color:C.inkSoft}}>{dov(g.amount,kur)}</div></Td>
          <Td>{canDelete&&<SilBtn onClick={()=>A.deleteExpense(g.id)}/>}</Td>
        </Tr>))}
        {giderler.length===0&&<Tr><Td><span style={{color:C.inkSoft}}>Gider kaydı yok.</span></Td></Tr>}
      </tbody></Tablo>
    </div>
  );
}

// === QR ETİKET + KAMERA TARAYICI ===========================================
const qrMetni=(u)=>`${typeof window!=="undefined"?window.location.origin:""}/?u=${u.id}`;
const uuidBul=(t)=>{ const m=String(t||"").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); return m?m[0]:null; };

async function etiketYazdir(liste){ // liste: [{urun, adet}]
  const QR=(await import("qrcode")).default;
  const kartlar=[];
  for(const {urun,adet} of liste){
    const png=await QR.toDataURL(qrMetni(urun),{margin:0,width:220,errorCorrectionLevel:"M"});
    for(let i=0;i<adet;i++) kartlar.push(`<div class="et">
      <img src="${png}" alt="">
      <div class="bilgi">
        <div class="ad">${esc(urun.ad)}</div>
        <div class="satir">${esc(urun.kod||"")}${urun.renk?` · ${esc(urun.renk)}`:""}</div>
        <div class="fiyat">${esc(tl(urun.satis))}</div>
      </div></div>`);
  }
  const html=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Ürün Etiketleri</title><style>
    @page{margin:8mm}
    *{box-sizing:border-box}
    body{font-family:Inter,Arial,Helvetica,sans-serif;margin:0;padding:0;background:#fff;color:#111}
    .sayfa{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
    .et{border:1px dashed #bbb;border-radius:6px;padding:4mm;display:flex;gap:3mm;align-items:center;break-inside:avoid}
    .et img{width:22mm;height:22mm;display:block}
    .bilgi{min-width:0}
    .ad{font-weight:700;font-size:10pt;line-height:1.2;word-break:break-word}
    .satir{font-size:8pt;color:#555;margin-top:1mm}
    .fiyat{font-size:12pt;font-weight:700;margin-top:1.5mm}
    @media print{.et{border-color:#ddd}}
  </style></head><body><div class="sayfa">${kartlar.join("")}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script></body></html>`;
  yazdirPenceresi(html);
}

function UrunKarti({urun,customers,kur,A,onClose}){
  const [sf,setSf]=useState({adet:"1",musteriId:"",odeme:"Nakit"});
  const [mesaj,setMesaj]=useState("");
  const sat=async()=>{ const adet=parse(sf.adet); if(adet<=0){setMesaj("Adet girin");return;}
    const r=await A.sale({urunId:urun.id,adet,musteriId:sf.musteriId||null,odeme:sf.odeme,birimFiyat:N(urun.satis),tarih:TODAY});
    if(r){setMesaj(r);return;} setMesaj("\u2713 Satis kaydedildi"); setTimeout(onClose,900); };
  return (<div>
    <div className="rounded-xl border p-4 mb-3" style={{borderColor:C.hair,background:C.paper}}>
      {urun.foto&&<img src={urun.foto} alt="" className="w-full rounded-lg object-contain mb-3" style={{maxHeight:"38vh",background:C.surface,border:`1px solid ${C.hair}`}}/>}
      <div className="text-lg font-semibold" style={{fontFamily:"'Instrument Serif', Georgia, serif"}}>{urun.ad}</div>
      <div className="text-xs mb-3" style={{color:C.inkSoft}}>{urun.kod}{urun.kategori?` \u00b7 ${urun.kategori}`:""}</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2.5" style={{background:C.surface,border:`1px solid ${C.hair}`}}>
          <div className="text-xs" style={{color:C.inkSoft}}>Stok</div>
          <div className="text-base font-semibold tabular-nums" style={{color:kritikMi(urun)?C.gider:C.ink}}>{sayi(urun.stok)} {urun.birim}</div>
        </div>
        <div className="rounded-lg p-2.5" style={{background:C.surface,border:`1px solid ${C.hair}`}}>
          <div className="text-xs" style={{color:C.inkSoft}}>Fiyat</div>
          <div className="text-base font-semibold tabular-nums" style={{color:C.gelir}}>{tl(urun.satis)}</div>
          <div className="text-xs tabular-nums" style={{color:C.inkSoft}}>{dov(N(urun.satis),kur)}</div>
        </div>
        <div className="rounded-lg p-2.5" style={{background:C.surface,border:`1px solid ${C.hair}`}}>
          <div className="text-xs" style={{color:C.inkSoft}}>Renk</div>
          <div className="text-base font-semibold">{urun.renk||"\u2014"}</div>
        </div>
      </div>
    </div>
    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:C.inkSoft}}>Hizli Satis</h4>
    <div className="grid grid-cols-2 gap-2.5">
      <div><Lbl>Adet</Lbl><input value={sf.adet} onChange={e=>setSf({...sf,adet:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
      <div><Lbl>Musteri (ops.)</Lbl><select value={sf.musteriId} onChange={e=>setSf({...sf,musteriId:e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{border:`1px solid ${C.hair}`,background:C.paper}}><option value="">Pesin musteri</option>{customers.map(c=><option key={c.id} value={c.id}>{c.ad}</option>)}</select></div>
      <div className="col-span-2"><Lbl>Odeme Sekli</Lbl><div className="flex gap-1.5 flex-wrap">{["Nakit","Kredi Kartı","Çek","Senet","Veresiye"].map(o=>{const a=sf.odeme===o;return(
        <button key={o} onClick={()=>setSf({...sf,odeme:o})} className="rounded-lg px-3 py-2 text-sm font-medium" style={{background:a?C.ink:"transparent",color:a?"#fff":C.inkSoft,border:`1px solid ${a?C.ink:C.hair}`}}>{o}</button>);})}</div></div>
    </div>
    <div className="text-sm tabular-nums mt-2" style={{color:C.inkSoft}}>Tutar: <b style={{color:C.ink}}>{tl(parse(sf.adet)*N(urun.satis))}</b></div>
    {mesaj&&<p className="text-sm mt-2" style={{color:mesaj.startsWith("\u2713")?C.gelir:C.gider}}>{mesaj}</p>}
    <div className="flex justify-end gap-2 mt-3">
      <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{border:`1px solid ${C.hair}`,color:C.inkSoft}}>Kapat</button>
      <button onClick={sat} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{background:C.gelir}}>Satisi Kaydet</button>
    </div>
  </div>);
}

function QrTara({products,customers,kur,A,onClose}){
  const videoRef=useRef(null); const canvasRef=useRef(null);
  const [durum,setDurum]=useState("Kamera açılıyor…");
  const [bulunan,setBulunan]=useState(null);
  const durRef=useRef(false);
  useEffect(()=>{
    let akis=null, rafId=null;
    (async()=>{
      try{
        akis=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});
        const v=videoRef.current; if(!v) return;
        v.srcObject=akis; v.setAttribute("playsinline","true"); await v.play();
        setDurum("QR kodu çerçeveye getirin");
        const jsQR=(await import("jsqr")).default;
        const cv=canvasRef.current, ctx=cv.getContext("2d",{willReadFrequently:true});
        const tara=()=>{
          if(durRef.current) return;
          if(v.readyState===v.HAVE_ENOUGH_DATA){
            cv.width=v.videoWidth; cv.height=v.videoHeight;
            ctx.drawImage(v,0,0,cv.width,cv.height);
            const img=ctx.getImageData(0,0,cv.width,cv.height);
            const kod=jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"});
            if(kod&&kod.data){
              const id=uuidBul(kod.data);
              const u=id?products.find(p=>p.id===id):null;
              if(u){ durRef.current=true; setBulunan(u);
                if(akis) akis.getTracks().forEach(t=>t.stop());
                if(navigator.vibrate) navigator.vibrate(60);
                return; }
              setDurum("Bu QR bir ürüne ait değil");
            }
          }
          rafId=requestAnimationFrame(tara);
        };
        rafId=requestAnimationFrame(tara);
      }catch(e){ setDurum("Kamera açılamadı: "+(e.message||"izin verilmedi")); }
    })();
    return ()=>{ durRef.current=true; if(rafId) cancelAnimationFrame(rafId); if(akis) akis.getTracks().forEach(t=>t.stop()); };
  },[products]);
  return (
    <Modal title={bulunan?"Ürün Bulundu":"QR Okut"} onClose={onClose}>
      {!bulunan&&(<div>
        <div className="relative rounded-xl overflow-hidden" style={{background:"#000",aspectRatio:"4/3"}}>
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline/>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={{width:"60%",aspectRatio:"1",border:`3px solid ${RENK.satis}`,borderRadius:16,boxShadow:"0 0 0 9999px rgba(0,0,0,.35)"}}/>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden"/>
        <p className="text-sm text-center mt-3" style={{color:C.inkSoft}}>{durum}</p>
      </div>)}
      {bulunan&&<UrunKarti urun={bulunan} customers={customers} kur={kur} A={A} onClose={onClose}/>}
    </Modal>
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
      <div className="w-28"><Lbl>USD/TRY</Lbl><input value={tmp.usd} onChange={e=>setTmp({...tmp,usd:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
      <div className="w-28"><Lbl>EUR/TRY</Lbl><input value={tmp.eur} onChange={e=>setTmp({...tmp,eur:fmtInput(e.target.value)})} inputMode="decimal" className="w-full rounded-lg px-3 py-2 text-sm outline-none tabular-nums" style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>
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
          <input value={cev} onChange={e=>setCev(fmtInput(e.target.value))} inputMode="decimal" placeholder="Tutar girin"
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
function KPI({etiket,deger,alt,renk=C.ink,icon,bg,ac,onClick,dov:dovStr}){
  return (<button onClick={onClick} className="text-left rounded-2xl border p-4 kart-golge kart-golge-hover hover:-translate-y-0.5" style={{background:C.surface,borderColor:C.hair,borderTop:`3px solid ${ac||(renk!==C.ink?renk:C.gold)}`}}>
    <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-wider" style={{color:C.inkSoft}}>{etiket}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{background:bg}}>{icon}</span></div>
    <div className="text-base sm:text-lg font-semibold tabular-nums" style={{color:renk,fontFamily:"'Instrument Serif', Georgia, serif"}}>{deger}</div>
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
  return (<div className={cls}><Lbl>{label}</Lbl><input value={v} onChange={e=>set(num?fmtInput(e.target.value):e.target.value)} inputMode={num?"decimal":"text"} className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${num?"tabular-nums":""}`} style={{border:`1px solid ${C.hair}`,background:C.paper}}/></div>);
}
function Lbl({children}){return <label className="block text-xs font-medium mb-1.5" style={{color:C.inkSoft}}>{children}</label>;}
function Tablo({children,bare}){return <div className={bare?"overflow-x-auto":"rounded-xl border overflow-x-auto"} style={bare?{}:{background:C.surface,borderColor:C.hair}}><table className="w-full text-sm">{children}</table></div>;}
function Tr({children,head,onClick}){return <tr onClick={onClick} className={`${head?"":"border-t group"} ${onClick?"cursor-pointer hover:bg-black/[0.02]":""}`} style={head?{}:{borderColor:C.hair}}>{children}</tr>;}
function Th({children,r}){return <th className={`px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap ${r?"text-right":"text-left"}`} style={{color:C.inkSoft}}>{children}</th>;}
function Td({children,r,mono,bold,style={}}){return <td className={`px-4 py-3 align-top ${r?"text-right":"text-left"} ${mono?"tabular-nums":""} ${bold?"font-semibold":""}`} style={style}>{children}</td>;}
function Rozet({children,renk,bg}){return <span className="text-xs px-1.5 py-0.5 rounded capitalize whitespace-nowrap" style={{background:bg,color:renk}}>{children}</span>;}
function SilBtn({onClick}){return <button onClick={onClick} className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded" title="Sil"><Trash2 size={15} color={C.gider}/></button>;}
function Modal({title,children,onClose,genis}){
  return (<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:"rgba(0,0,0,0.5)"}} onClick={onClose}>
    <div className={`relative w-full ${genis?"sm:max-w-4xl":"sm:max-w-xl"} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl kart-golge`} style={{background:C.surface}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0" style={{borderColor:C.hair,background:C.surface}}>
        <span className="text-base font-semibold" style={{fontFamily:"'Instrument Serif', Georgia, serif"}}>{title}</span><button onClick={onClose}><X size={18} color={C.inkSoft}/></button></div>
      <div className="p-5">{children}</div></div></div>);
}
