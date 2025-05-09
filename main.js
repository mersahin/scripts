"use strict";

var css = `
  .sayfa_bilgisi {
    color: white;
    font-size: 30px;
    font-weight: bold;
    text-align: center;
    inline-size: -webkit-fill-available;
    background: deeppink;
  }

  .bos {
    font-size: 5px;
  }

  .fiyat_bos {
    border: 2px solid yellow;
    background: yellow;
  }

  .fiyat_100den_fazla {
    // opacity: 0.3;
    background: lightgray;
    flex: none;
  }

  .fiyat_100den_fazla .aditem-main--middle--description {
    display: none;
  }

  .fiyat_vb {
    background: lightgray;
  }

  .fiyat_10dan_az {
    border: 5px solid green;
    background: greenyellow;
  }

  .digerleri {
    background: lightgray;
  }

  .monheim {
    border: 5px solid red;
  }


  .ilan_bilgileri {
    display: inline-block;
    border: 3px solid rgb(204, 204, 204);
    width: 333px;
  }

  #smooth-scroll-button {
    position: fixed; top: 0; right: 0; z-index: 9999;
    padding: 10px; border-radius: 10px; cursor: pointer; font-size: 70px; font-weight: bold;
  }
  .image_size_normal, .image_size_small {
    height: 160px
  }

  /* New styles for data copier */
  #data-copier-container {
    position: fixed;
    top: 120px; /* Adjusted to be below the scroll button */
    right: 10px;
    z-index: 10000;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  #copy-data-button {
    padding: 8px 12px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  #copy-data-button:hover {
    background-color: #0056b3;
  }
  #data-copier-container p {
    font-size: 12px;
    margin: 5px 0 0 0;
    color: #333;
  }
`;

var style = document.createElement('style');
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

// Add UI elements
$("body").prepend(`
<div id="ilanlar"></div>
<div id="smooth-scroll-button">⬆️</div>
<div id="data-copier-container">
  <button id="copy-data-button">İlan Verilerini Kopyala</button>
  <p id="copy-status-message"></p>
</div>
`);
// Hidden textarea for copy mechanism (not strictly needed with navigator.clipboard but good fallback/visual)
$("body").append(`<textarea id="json-data-holder" style="opacity:0; position:absolute; left:-9999px;"></textarea>`);


const guid_generator = function () {
  const s4 = function () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

$("#ilanlar").css({
  display: "flex",
  'flex-flow': 'wrap',
  background: 'black'
});

let visitedLinks = [];
const interval = 5 * 1000; // 5 saniye
let url = location.href;

// --- NEW: Array to store all item data ---
let allItemsData = [];
// -------------------------------------------

const run = function (_url) {
  console.log("run", _url);
  $.get(`${_url}`, function (data) {
    let ilanlar = $(data).find(
      ".ad-listitem:not(.is-topad) .aditem-main"
    );

    let yeni_ilanlar = 0;
    for (let i = 0; i < ilanlar.length; i++) {
      let link = $(ilanlar[i]).find('a').attr("href");
      if (!visitedLinks.includes(link)) {
        yeni_ilanlar++;
      }
    }
    let seite = 0;
    if(_url.includes("seite:")){
      seite = parseInt(_url.split("seite:")[1].split("/")[0]);
      seite--;
      if(seite < 2){
        url = _url.replace(`/seite:${seite + 1}`, "");
        url = url.replace("s-seite:2", "s-suchen.html").replace("s-seite:1", "s-suchen.html");
      }
      else{
        url = _url.replace(`seite:${seite + 1}`, "seite:" + seite);
      }
    }
    else if(_url.includes("pageNum=")){
      seite = parseInt(_url.split("pageNum=")[1].split("&")[0]);
      seite--;
      if(seite < 2){
        url = _url.replace(`pageNum=${seite + 1}`, "");
        url = url.replace("pageNum=2", "s-suchen.html").replace("pageNum=1", "s-suchen.html");
      }
      else{
        url = _url.replace(`pageNum=${seite + 1}`, "pageNum=" + seite);
      }
    }
    else if (yeni_ilanlar == 25) {
      if (_url.includes("s-suchen.html"))
        url = _url.replace("s-suchen.html", "s-seite:2");
    }

    var $ilanlarDiv = $("#ilanlar");
    var $sayfa_bilgisi = $(`
    <div class='ilan sayfa_bilgisi'>
      Sayfa: ${parseInt(seite) + 1} - ${yeni_ilanlar} adet ilan bulundu (${allItemsData.length} toplam)
    </div>`);
    if (yeni_ilanlar !== 0) {
      console.log("get", yeni_ilanlar);
      setTimeout(function () {
        $("#smooth-scroll-button").trigger("click");
      }, 3000);
      $ilanlarDiv.prepend($sayfa_bilgisi);
    } else {
      $sayfa_bilgisi.addClass("bos");
      $sayfa_bilgisi.text("-");
      $ilanlarDiv.prepend($sayfa_bilgisi);
    }

    ilanlar = $(ilanlar.get().reverse());
    ilanlar.each(function () {
      let link = $(this).find('a').attr("href");
      if (!visitedLinks.includes(link)) {
        console.log("new link", link);
        let guid = guid_generator();
        $("#ilanlar").prepend("<div class='ilan' id='" + guid + "'></div>");

        let fiyat = $(this).find(".aditem-main--middle--price-shipping--price").text().trim();
        let fiyatNumberStr = fiyat.replace("€", "").replace("VB", "").replace(".", "").trim();
        let fiyatNumber = fiyatNumberStr ? parseInt(fiyatNumberStr) : null;
        if (fiyat.toLowerCase() === "zu verschenken") fiyatNumber = 0;


        fiyata_gore_style(fiyat, guid, fiyatNumber);
        let isMonheim = $(this).find(".aditem-main--top--left").text().includes("Monheim");
        if(isMonheim)
          $(`#${guid}`).addClass("monheim");  

        let aditemMainMiddle = $(this);
        let clonedAditemMainMiddle = aditemMainMiddle.clone();
        clonedAditemMainMiddle.addClass("ilan_bilgileri");
        styleFixer(clonedAditemMainMiddle);
        $(`#${guid}`).prepend(clonedAditemMainMiddle);
        
        visitedLinks.push(link);
        let detail = aditemMainMiddle.text().replace(/\s\s+/g, ' ').replace(/\n\n+/g, '\n').trim();
        let urunAdiFromList = $(this).find("h2").text().trim();

        // --- NEW: Create item data object ---
        let itemData = {
            guid: guid,
            platformLink: "https://www.kleinanzeigen.de" + link,
            title: urunAdiFromList, // Initial title from list
            priceRaw: fiyat,
            priceNumeric: fiyatNumber,
            descriptionSummary: detail,
            isMonheim: isMonheim,
            images: [], // Will be filled by resimleri_yukle
            timestamp: new Date().toISOString()
        };
        allItemsData.push(itemData);
        // -----------------------------------
        
        resimleri_yukle(link, fiyatNumber, guid, urunAdiFromList, detail, itemData); // Pass itemData
      }
    });
  });
};

let messageQueue = [];
let lastSentTime = 0;

const send_msg = (function() {
  const processQueue = async () => {
    if (messageQueue.length > 0) {
      const currentTime = Date.now();
      if (currentTime - lastSentTime >= 13 * 1000) { // Increased to 13 seconds for safety
        const { msg, img, itemDataObject } = messageQueue.shift(); // itemDataObject for potential updates
        console.log(">>> messageQueue -- LENGTH: ", messageQueue.length);
        const result = await sendPhoto(msg, img, itemDataObject);
        if (result !== true) {
          messageQueue.push({ msg, img, itemDataObject }); // Push back if failed
          console.log(">>> messageQueue ++ LENGTH: ", messageQueue.length);
        }
        lastSentTime = currentTime;
      }
    }
    setTimeout(processQueue, 1000);
  };

  const sendPhoto = async (msg, img, itemDataObject) => {
    const botToken = '7474862840:AAEcF0hqSiyqXlGQCTEVvru08QWTYx1H0D0';
    const chatId = '-4553420125'; // Ensure this is a string
    const photoUrl = img;
    const caption = msg;
    const url = `https://api.telegram.org/bot${botToken}/sendMediaGroup`;

    try {
        const mediaPayload = photoUrl.slice(0, 10).map((i, index) => ({
            type: 'photo',
            media: i,
            ...(index === 0 && { caption: caption }) // Caption only on the first image
        }));

        // If no images, send as a simple message (Telegram doesn't like empty media groups)
        if (mediaPayload.length === 0) {
            console.log("No images to send for media group, sending as text message.");
            const textUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const response = await fetch(textUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: caption,
                    parse_mode: 'HTML' // Or Markdown, if your caption uses it
                })
            });
            const data = await response.json();
            console.log("Text message response:", data);
            if (!response.ok) throw new Error(data.description || `HTTP error! status: ${response.status}`);
            return true;
        }


        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              // caption: caption, // Caption is now part of the media item
              media: mediaPayload
            })
        });
        const data = await response.json();
        console.log("sendMediaGroup response:", data);

        if (!response.ok) {
            // Log specific Telegram error
            console.error('Telegram API Error:', data.description, 'Error Code:', data.error_code);
            if (itemDataObject && data.parameters && data.parameters.retry_after) {
                console.warn(`Rate limited. Retrying for item ${itemDataObject.guid} after ${data.parameters.retry_after}s`);
                // Re-queue the message with a delay (or let processQueue handle it if it's a general rate limit)
                // For simplicity, just letting processQueue retry.
            }
            throw new Error(data.description || `HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Failed to send photo/message:', error);
        return error; // Return the error object
    }
  };

  processQueue();
  return function(msg, img, itemDataObject) { // Added itemDataObject
    messageQueue.push({ msg, img, itemDataObject });
    console.log(">>> messageQueue ++ LENGTH: ", messageQueue.length);
  };
})();
send_msg("Script started. Monitoring Kleinanzeigen.", ["https://ersah.in/mersahin.jpg"], null); // Pass null for itemData on initial message

function resimleri_yukle(link, fiyatNumber, guid, urunAdi, detail, itemDataObject) { // Added itemDataObject
  $.ajax({
    url: "https://www.kleinanzeigen.de" + link, // Ensure full URL for ajax
    success: function (data) {
      let imageElement = $(data).find("#viewad-image"); // This is usually the main image container
      let images = [];

      if (imageElement.length > 0) {
        // Try to get all images if they are in a gallery structure
        let galleryImages = $(data).find('.galleryimage-element img, #viewad-image img, #viewad-images .galleryimage-image');
        if (galleryImages.length > 0) {
            images = galleryImages.map((i, el) => $(el).attr('src') || $(el).data('imgsrc')).get();
            // Filter out potential placeholders or undefined sources
            images = images.filter(src => src && !src.startsWith('data:image'));
        } else if (imageElement.attr('src')) { // Fallback for single image
            images.push(imageElement.attr('src'));
        }

        if (images.length > 0) {
            // For display on page, just use the first image or the #viewad-image
            let displayImageSrc = images[0];
            let $clonedImageContainer = $('<div class="image-container"></div>'); // Create a container
            let $displayImg = $('<img>').attr('src', displayImageSrc);

            $displayImg.addClass(fiyatNumber > 100 ? "image_size_normal" : "image_size_small");
            $displayImg.wrap('<a href="https://www.kleinanzeigen.de' + link + '" target="_blank"></a>');
            $clonedImageContainer.append($displayImg.parent());
            $(`#${guid}`).append($clonedImageContainer);
        }
      }

      // Update itemDataObject with images and potentially more accurate title
      if (itemDataObject) {
          itemDataObject.images = images.slice(0,10); // Telegram supports up to 10 images in media group
          let urunAdiFromDetailPage = $(data).find("#viewad-title").text().trim(); // More specific selector for title on detail page
          if (urunAdiFromDetailPage) {
              itemDataObject.title = urunAdiFromDetailPage;
          }
          // You could also try to get a more detailed description here if needed
          // itemDataObject.fullDescription = $(data).find("#viewad-description-text").text().trim();
      }
      
      let fullurl = "https://www.kleinanzeigen.de" + link;
      // Use the potentially updated title from itemDataObject
      let captionTitle = itemDataObject ? itemDataObject.title : urunAdi;
      let caption = 
      `${captionTitle}
      Fiyat: ${fiyatNumber !== null ? fiyatNumber + "€" : (fiyat || "N/A")}
      Link: ${fullurl}
      Detay (özet): ${detail.substring(0, 500)}...`; // Keep detail summary concise for Telegram
      
      let captionWithLimit = caption.substring(0, 1024); // Telegram caption limit
      send_msg(captionWithLimit, itemDataObject ? itemDataObject.images : images, itemDataObject);
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.error("Error fetching ad details for " + link + ": " + textStatus, errorThrown);
        // Still try to send a message but with no images, and indicate error
        let fullurl = "https://www.kleinanzeigen.de" + link;
        let captionTitle = itemDataObject ? itemDataObject.title : urunAdi;
        let caption = 
        `${captionTitle}
        Fiyat: ${fiyatNumber !== null ? fiyatNumber + "€" : (fiyat || "N/A")}
        Link: ${fullurl}
        (Resimler yüklenemedi - AJAX hatası)
        Detay (özet): ${detail.substring(0, 500)}...`;
        send_msg(caption.substring(0,1024), [], itemDataObject); // Send with empty images
    }
  });
}


function fiyata_gore_style(fiyat, guid, fiyatNumber) {
  if (fiyat == "" || fiyat.toLowerCase() == "zu verschenken")
    $(`#${guid}`).addClass("fiyat_bos");
  else if (fiyatNumber !== null && fiyatNumber > 100)
    $(`#${guid}`).addClass("fiyat_100den_fazla");
  else if (fiyat.toUpperCase() == "VB")
    $(`#${guid}`).addClass("fiyat_vb");
  else if (fiyatNumber !== null && fiyatNumber < 11)
    $(`#${guid}`).addClass("fiyat_10dan_az");
  else
    $(`#${guid}`).addClass("digerleri");
}

function scroll_isleri() {
  var scrolling = false;
  var animationFrame;

  $("#smooth-scroll-button").on("click", function (event) {
    if (!scrolling) {
      scrolling = true;
      $("#smooth-scroll-button").css("background", "green");
      var scrollAmount = 0.002;
      function scrollStep() {
        var currentScroll = $(window).scrollTop();
        if (currentScroll <= 10) {
          scrolling = false;
          $("#smooth-scroll-button").css("background", "red");
          cancelAnimationFrame(animationFrame);
        } else {
          window.scrollTo(0, currentScroll - scrollAmount * $(window).height());
          animationFrame = requestAnimationFrame(scrollStep);
        }
      }
      animationFrame = requestAnimationFrame(scrollStep);
    }
  });
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      scrolling = false;
      $("#smooth-scroll-button").css("background", "red");
      cancelAnimationFrame(animationFrame);
    } else if (event.key === " ") {
      event.preventDefault();
      $("#smooth-scroll-button").trigger("click");
    }
  });
}

function styleFixer(clonedAditemMainMiddle) {
  clonedAditemMainMiddle.find(".aditem-main--middle--price-shipping--price").css("font-size", "30px");
  clonedAditemMainMiddle.find("p").css("margin", "0");
  clonedAditemMainMiddle.find("h2").css("margin", "0");
}

// --- NEW: Copy to Clipboard Functionality ---
$("#copy-data-button").on("click", function() {
    const jsonDataString = JSON.stringify(allItemsData, null, 2); // Pretty print JSON
    const $statusMsg = $("#copy-status-message");

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsonDataString).then(function() {
            $statusMsg.text("JSON verileri panoya kopyalandı!");
            console.log('Async: Copying to clipboard was successful!');
            setTimeout(() => $statusMsg.text(""), 3000); // Clear message after 3s
        }, function(err) {
            $statusMsg.text("Otomatik kopyalanamadı.");
            console.error('Async: Could not copy text: ', err);
            // Fallback: use hidden textarea
            const $jsonHolder = $("#json-data-holder");
            $jsonHolder.val(jsonDataString).css('opacity',1).select(); // Make it visible temporarily for manual copy if needed
            try {
                document.execCommand('copy');
                $statusMsg.text("JSON verileri panoya kopyalandı (fallback)!");
                setTimeout(() => {
                    $statusMsg.text("");
                    $jsonHolder.css('opacity',0);
                }, 3000);
            } catch (e) {
                $statusMsg.text("Kopyalama başarısız. Konsolu kontrol edin.");
                console.error("Fallback copy failed", e);
            }
        });
    } else {
        // Fallback for older browsers
        const $jsonHolder = $("#json-data-holder");
        $jsonHolder.val(jsonDataString).css('opacity',1).select();
        try {
            document.execCommand('copy');
            $statusMsg.text("JSON verileri panoya kopyalandı (eski yöntem)!");
            setTimeout(() => {
                $statusMsg.text("");
                $jsonHolder.css('opacity',0);
            }, 3000);
        } catch (e) {
            $statusMsg.text("Kopyalama desteklenmiyor/başarısız.");
            console.error("Legacy copy failed", e);
        }
    }
});
// -------------------------------------------


$(document).ready(function() {
  setTimeout(function() {
    window.scrollBy(0, 100);
  }, interval);
  scroll_isleri();
  run(url); // Run once immediately
  setInterval(function() {
    run(url)
  }, interval);
});
