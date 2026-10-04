(function(){
  function init(ctx){
    const {db,$,toast,dbError,getCurrentUser,getCurrentProfile}=ctx;
    let pages=[],pageIndex=-1,busy=false;
    const isChief=()=>{
      const u=getCurrentUser(),p=getCurrentProfile();
      return !!u && p?.access_status==="approved" && p?.medical_grade==="chef_de_cabinet";
    };
    function render(){
      const cover=pageIndex<0;
      $("guideCover").hidden=!cover;
      $("guidePaper").hidden=cover;
      const page=cover?null:pages[pageIndex];
      if(page){
        $("guidePageTitle").textContent=page.title||"Guide de la médecine";
        $("guidePageBody").textContent=page.body||"";
        $("guidePageBody").classList.toggle("guide-final",!!page.is_final);
      }else{
        $("guidePageBody").classList.remove("guide-final");
      }
      $("guidePrev").disabled=pageIndex<0;
      $("guideNext").disabled=pageIndex>=pages.length-1;
      $("guideCounter").textContent=cover?"Couverture":("Page "+(pageIndex+1)+" / "+pages.length);
      $("guideDeletePage").disabled=!page||!!page.is_final||!isChief();
    }
    async function load(){
      if(busy)return;
      busy=true;
      $("guideStatus").textContent="Chargement…";
      try{
        const {data,error}=await db.from("medicine_guide_pages").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
        if(error)throw error;
        pages=data||[];
        pageIndex=Math.min(pageIndex,pages.length-1);
        $("guideToggleAdmin").hidden=!isChief();
        render();
        $("guideStatus").textContent=pages.length+" pages";
      }catch(e){
        $("guideStatus").textContent="Chargement impossible";
        dbError(e);
      }finally{busy=false;}
    }
    $("guideHome").addEventListener("click",()=>{pageIndex=-1;render();});
    $("guideRefresh").addEventListener("click",load);
    $("guidePrev").addEventListener("click",()=>{if(pageIndex>=0){pageIndex--;render();}});
    $("guideNext").addEventListener("click",()=>{if(pageIndex<pages.length-1){pageIndex++;render();}});
    $("guideToggleAdmin").addEventListener("click",()=>{if(isChief())$("guideAdmin").classList.toggle("show");});
    $("guideAddPage").addEventListener("click",async()=>{
      if(!isChief())return toast("Action réservée au Chef de cabinet.");
      const title=$("guideNewTitle").value.trim(),body=$("guideNewBody").value.trim();
      if(!title||!body)return toast("Renseigne le titre et le contenu.");
      const finalPage=pages.find(p=>p.is_final);
      const order=finalPage?finalPage.sort_order:(pages.length+1);
      const {error}=await db.from("medicine_guide_pages").insert({title,body,sort_order:order,is_final:false});
      if(error)return dbError(error);
      if(finalPage){
        const move=await db.from("medicine_guide_pages").update({sort_order:order+1}).eq("id",finalPage.id);
        if(move.error)return dbError(move.error);
      }
      $("guideNewTitle").value="";
      $("guideNewBody").value="";
      await load();
      pageIndex=Math.max(0,pages.length-2);
      render();
      toast("Page ajoutée.");
    });
    $("guideDeletePage").addEventListener("click",async()=>{
      if(!isChief())return toast("Action réservée au Chef de cabinet.");
      const page=pages[pageIndex];
      if(!page||page.is_final)return toast("Cette page ne peut pas être supprimée.");
      if(!confirm("Supprimer cette page du Guide de la médecine ?"))return;
      const {error}=await db.from("medicine_guide_pages").delete().eq("id",page.id);
      if(error)return dbError(error);
      pageIndex=Math.max(-1,pageIndex-1);
      await load();
      toast("Page supprimée.");
    });
    render();
    return {load,render,isChief};
  }
  window.RhodesMedicineGuide={init};
})();