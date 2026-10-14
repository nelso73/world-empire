/* Achats intégrés Microsoft Store (API Digital Goods d'Edge). Actif seulement quand le jeu est installé depuis le Microsoft Store sur Windows.
   Dans un navigateur ordinaire, l'API n'existe pas: la boutique reste cachée (aucun faux achat). */
(function(){
  if(!window.MONET||typeof window.getDigitalGoodsService!=='function')return;
  var ID={g1:'we_g1',g2:'we_g2',g3:'we_g3',g4:'we_g4',f1:'we_f1',f2:'we_f2',f3:'we_f3',na:'we_na',ul:'we_ul'};
  var PERM=['na','ul'],BY={},KEY='we-ms-granted',svc=null;
  Object.keys(ID).forEach(function(k){BY[ID[k]]=k});
  function granted(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
  function mark(t){var g=granted();if(g.indexOf(t)<0){g.push(t);try{localStorage.setItem(KEY,JSON.stringify(g.slice(-60)))}catch(e){}}}
  function consume(t){try{return Promise.resolve(svc.consume(t)).catch(function(){})}catch(e){return Promise.resolve()}}
  /* Remet en ordre les achats: durables (Premium/Ultime) rétablis, consommables payés mais non crédités rattrapés */
  function recover(){
    return svc.listPurchases().then(function(list){
      var jobs=[];
      (list||[]).forEach(function(p){
        var k=BY[p.itemId];if(!k)return;
        if(PERM.indexOf(k)>=0){if(window.weRestore)weRestore(k);return}
        if(granted().indexOf(p.purchaseToken)<0&&window.weGrant){mark(p.purchaseToken);weGrant(k)}
        jobs.push(consume(p.purchaseToken));
      });
      return Promise.all(jobs);
    });
  }
  function enable(){
    window.WE_NOPAY=false;
    MONET.checkout=function(pack,ok,ko){
      var id=ID[pack.id];if(!id||!svc){ko();return}
      var tok;
      svc.getDetails([id]).then(function(r){
        if(!r||!r.length)throw new Error('no item');
        var req=new PaymentRequest([{supportedMethods:'https://store.microsoft.com/billing',data:{sku:r[0].itemId}}]);
        return req.show();
      }).then(function(resp){
        tok=resp.details&&resp.details.purchaseToken;
        return Promise.resolve(resp.complete('success')).catch(function(){});
      }).then(function(){
        if(tok&&PERM.indexOf(pack.id)<0)mark(tok);
        ok();
        if(tok&&PERM.indexOf(pack.id)<0)consume(tok);
      }).catch(function(){ko()});
    };
    MONET.restoreAll=function(done){
      recover().then(function(){done&&done(true)},function(){done&&done(false)});
    };
    /* Prix réels, dans la devise et la langue de l'utilisateur */
    svc.getDetails(Object.keys(ID).map(function(k){return ID[k]})).then(function(items){
      MONET.prices=MONET.prices||{};
      (items||[]).forEach(function(it){
        var k=BY[it.itemId];if(!k||!it.price)return;
        try{MONET.prices[k]=new Intl.NumberFormat(navigator.language,{style:'currency',currency:it.price.currency}).format(it.price.value)}catch(e){}
      });
    }).catch(function(){}).then(function(){if(window.weRefresh)weRefresh()});
    recover().catch(function(){});
    if(window.weRefresh)weRefresh();
  }
  window.getDigitalGoodsService('https://store.microsoft.com/billing').then(function(s){svc=s;enable()}).catch(function(){});
})();
