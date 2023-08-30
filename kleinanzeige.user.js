// ==UserScript==
// @name         kleinanzeige
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       @mersahin
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @require file://D:\perso\scripts\kleinanzeige.user.js
// @require https://github.com/mersahin/scripts/raw/main/kleinanzeige.user.js
// @match https://www.kleinanzeigen.de/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kleinanzeigen.de
// @updateURL https://github.com/mersahin/scripts/raw/main/kleinanzeige.user.js
// @grant        none
// ==/UserScript==

"use strict";
// Resimleri göstereceğimiz bir div eklemeliyiz
$("body").prepend('<div id="yanyana-resimler"></div>');
const guid_generator = function () {
  const s4 = function () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};
// Stil eklemek için CSS kullanabilirsiniz
$("#yanyana-resimler").css({
  display: "flex",
  'flex-flow': 'wrap'
});
let visitedLinks = [];
// Zamanlayıcı aralığı (örneğin 5 dakika)
const interval = 5 * 1000; // 5 saniye
let url = location.href;// "https://www.kleinanzeigen.de/s-40789/l1116r5";
const run = function (url, append = false) {

  $.get(`${url}`, function (data) {
    let ilanlar = $(data).find(
      ".ad-listitem:not(.is-topad) .aditem-main"
    );
    console.log("get", ilanlar.length);
    // if not visited
    // Linklerde değişiklik olduğu tespit edildi, kodu çalıştır
    ilanlar.each(function () {
      let link = $(this).find('a').attr("href");
      if (!visitedLinks.includes(link)) {
        let guid = guid_generator();
        // all link one div with guid
        if(append)
          $("#yanyana-resimler").append("<div class='ilan' id='" + guid + "'></div>");
        else
          $("#yanyana-resimler").prepend("<div class='ilan' id='" + guid + "'></div>");
        // if preise weniger als 10 euro then border is green
        let fiyat = $(this).find(".aditem-main--middle--price-shipping--price").text().trim()
        if(fiyat.replace("€", "").replace("VB", "").replace(".", ",") < 10 || fiyat == "Zu verschenken")
          $(`#${guid}`).css({
            // display: 'inline-flex',
            border: '2px solid green',
            background: 'greenyellow'
          });
        else
          $(`#${guid}`).css({
            // display: 'inline-flex',
            border: '2px solid red'
          });

        // add information from class aditem-main--middle
        let aditemMainMiddle = $(this)
        let clonedAditemMainMiddle = aditemMainMiddle.clone();
        styleFixer(clonedAditemMainMiddle);

        $(`#${guid}`).prepend(clonedAditemMainMiddle);
        
        visitedLinks.push(link);
        console.log("new link", link);
        $.ajax({
          url: link,
          success: function (data) {
            let imageElement = $(data).find("#viewad-image");

            if (imageElement.length > 0) {
              let clonedImage = imageElement.clone();
              clonedImage.css("height", "150px");
              clonedImage.wrap('<a href="' + link + '" target="_blank"></a>');
              $(`#${guid}`).append(clonedImage.parent());
            }
          },
        });
      }
    });
    // location.reload();
  });
};
// Zamanlayıcıyı başlatma
run(location.href, true, 1);
// refresh 5 saniyede bir
setInterval(function() {
   run(url)
}, interval);

// refresh every 20 seconds
setInterval(function () {
  // location.reload();
}, 20 * 1000);

function styleFixer(clonedAditemMainMiddle) {
  clonedAditemMainMiddle.css("display", "inline-block");
  clonedAditemMainMiddle.css("border", "3px solid #ccc");
  clonedAditemMainMiddle.find(".aditem-main--middle--price-shipping--price").css("font-size", "30px");
  clonedAditemMainMiddle.find("p").css("margin", "0");
  clonedAditemMainMiddle.find("h2").css("margin", "0");
  clonedAditemMainMiddle.css("width", "333px");
}

