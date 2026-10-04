(function(){
  function init(ctx){
    const {db,$,toast,dbError,getCurrentUser,getCurrentProfile}=ctx;
    let pages=[],pageIndex=0,busy=false;
    const isChief=()=>{
      const u=getCurrentUser(),p=getCurrentProfile();
      return !!u && p?.access_status==="approved" && p?.medical_grade==="chef_de_cabinet";
    };
    function preloadNext(){
      const next=pages[pageIndex+1];
      if(next?.image_path){
        const im=new Image();
        im.src=next.image_path;
      }
    }
    function render(){
      if(!pages.length){
        $("guideImagePage").hidden=true;
        $("guidePaper").hidden=false;
        $("guidePageTitle").textContent="Guide de la médecine";
        $("guidePageBody").textContent="Aucune page disponible.";
        $("guideCounter").textContent="";
        $("guidePrev").disabled=true;
        $("guideNext").disabled=true;
        return;
      }
      pageIndex=Math.max(0,Math.min(pageIndex,pages.length-1));
      const page=pages[pageIndex];
      const imageMode=!!page.image_path;
      $("guideImagePage").hidden=!imageMode;
      $("guidePaper").hidden=imageMode;
      if(imageMode){
        $("guidePageImage").src=page.image_path;
        $("guidePageImage").alt=page.title||("Page "+(pageIndex+1));
      }else{
        $("guidePageTitle").textContent=page.is_final?"":(page.title||"Guide de la médecine");
        $("guidePageBody").textContent=page.body||"";
        $("guidePageBody").classList.toggle("guide-final",!!page.is_final);
      }
      $("guidePrev").disabled=pageIndex<=0;
      $("guideNext").disabled=pageIndex>=pages.length-1;
      $("guideCounter").textContent="Page "+(pageIndex+1)+" / "+pages.length;
      $("guideDeletePage").disabled=!!page.is_final||!isChief();
      preloadNext();
    }
    async function load(){
      if(busy)return;
      busy=true;
      $("guideStatus").textContent="Chargement…";
      try{
        const {data,error}=await db.from("medicine_guide_pages").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
        if(error)throw error;
        pages=data||[];
        if(pageIndex>=pages.length)pageIndex=Math.max(0,pages.length-1);
        $("guideToggleAdmin").hidden=!isChief();
        render();
        $("guideStatus").textContent=pages.length+" pages";
      }catch(e){
        $("guideStatus").textContent="Chargement impossible";
        dbError(e);
      }finally{busy=false;}
    }
    $("guideHome").addEventListener("click",()=>{pageIndex=0;render();});
    $("guideRefresh").addEventListener("click",load);
    $("guidePrev").addEventListener("click",()=>{if(pageIndex>0){pageIndex--;render();}});
    $("guideNext").addEventListener("click",()=>{if(pageIndex<pages.length-1){pageIndex++;render();}});
    $("guideToggleAdmin").addEventListener("click",()=>{if(isChief())$("guideAdmin").classList.toggle("show");});
    $("guideAddPage").addEventListener("click",async()=>{
      if(!isChief())return toast("Action réservée au Chef de cabinet.");
      const title=$("guideNewTitle").value.trim(),body=$("guideNewBody").value.trim();
      if(!title||!body)return toast("Renseigne le titre et le contenu.");
      const finalPage=pages.find(p=>p.is_final);
      const order=finalPage?finalPage.sort_order:(pages.length+1);
      const {error}=await db.from("medicine_guide_pages").insert({title,body,sort_order:order,is_final:false,image_path:null});
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
      pageIndex=Math.max(0,pageIndex-1);
      await load();
      toast("Page supprimée.");
    });
    $("guidePageImage").addEventListener("error",()=>{$("guideStatus").textContent="Image introuvable";});
    render();
    return {load,render,isChief};
  }
  window.RhodesMedicineGuide={init};
})();