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

    `;

var style = document.createElement('style');
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

// add smooth scroll button in sticky div
$("body").prepend(`
<div id="ilanlar"></div>
<div id="smooth-scroll-button">⬆️</div>
`);

const guid_generator = function () {
  const s4 = function () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};
// Stil eklemek için CSS kullanabilirsiniz
$("#ilanlar").css({
  display: "flex",
  'flex-flow': 'wrap',
  background: 'black'
});
let visitedLinks = [];
// Zamanlayıcı aralığı (örneğin 5 dakika)
const interval = 5 * 1000; // 5 saniyes
let url = location.href;// "https://www.kleinanzeigen.de/s-40789/l1116r5";
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
      // ilk sayfadaki link sayisi 25 ise ikinci sayfaya git
      // if "s-suchen.html" -> "s-seite:2"
      if (_url.includes("s-suchen.html"))
        url = _url.replace("s-suchen.html", "s-seite:2");
      // else {
      //   debugger
      //   url = _url + "/seite:2";
      // }
    }
    var $ilanlarDiv = $("#ilanlar");
    var $sayfa_bilgisi = $(`
    <div class='ilan sayfa_bilgisi'>
      Sayfa: ${parseInt(seite) + 1} - ${yeni_ilanlar} adet ilan bulundu
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
    // ilanlar jquery array ters çevir
    ilanlar = $(ilanlar.get().reverse());
    ilanlar.each(function () {
      let link = $(this).find('a').attr("href");
      if (!visitedLinks.includes(link)) {
        console.log("new link", link);
        let guid = guid_generator();
        // all link one div with guid
        $("#ilanlar").prepend("<div class='ilan' id='" + guid + "'></div>");
        // if preise weniger als 10 euro then border is green
        let fiyat = $(this).find(".aditem-main--middle--price-shipping--price").text().trim();
        let fiyatNumber = fiyat.replace("€", "").replace("VB", "").replace(".", "").trim();
        fiyata_gore_style(fiyat, guid, fiyatNumber);
        if($(this).find(".aditem-main--top--left").text().includes("Monheim"))
          $(`#${guid}`).addClass("monheim");  

        // add information from class aditem-main--middle
        let aditemMainMiddle = $(this)
        let clonedAditemMainMiddle = aditemMainMiddle.clone();
        // addclass
        clonedAditemMainMiddle.addClass("ilan_bilgileri");
        styleFixer(clonedAditemMainMiddle);

        $(`#${guid}`).prepend(clonedAditemMainMiddle);
        
        visitedLinks.push(link);
        let detail = aditemMainMiddle.text().replace(/\s\s+/g, ' ').replace(/\n\n+/g, '\n');
        let urunAdi = $(this).find("h2").text().trim()
        resimleri_yukle(link, fiyatNumber, guid, urunAdi, detail);
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
      if (currentTime - lastSentTime >= 13 * 1000) {
        const { msg, img } = messageQueue.shift();
        console.log(">>> messageQueue -- LENGTH: ", messageQueue.length);
        const result = await sendPhoto(msg, img);
        if (result !== true) {
          messageQueue.push({ msg, img });
          console.log(">>> messageQueue ++ LENGTH: ", messageQueue.length);
        }
        lastSentTime = currentTime;
      }
    }

    setTimeout(processQueue, 1000);
  };

  const sendPhoto = async (msg, img) => {
    // Telegram Bot Token
    const botToken = '7474862840:AAEcF0hqSiyqXlGQCTEVvru08QWTYx1H0D0';

    // Chat ID (Mesajı göndermek istediğiniz kullanıcının veya grubun chat ID'si)
    const chatId = '-4553420125';

    // Göndermek istediğiniz fotoğrafın URL'si veya file_id'si
    const photoUrl = img;

    // Mesajın açıklaması (isteğe bağlı)
    
    const caption = msg;

    // Fotoğrafı göndermek için POST isteği
    const url = `https://api.telegram.org/bot${botToken}/sendMediaGroup`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              caption: caption,
              media: photoUrl.slice(0, 10).map((i, index) => ({
                  type: 'photo',
                  media: i,
                  ...(index === 0 && { caption: caption})
              }))
            })
        });
        const data = await response.json();
        console.log(data);

        if (!response.ok) {
            throw new Error(data);
        }
        return true;
    } catch (error) {
        console.error('Failed to send photo:', error);
        return error;
    }
  };

  processQueue();
  return function(msg, img) {
    messageQueue.push({ msg, img });
    console.log(">>> messageQueue ++ LENGTH: ", messageQueue.length);
  };
})();
send_msg("start", ["https://ersah.in/mersahin.jpg"]);

function resimleri_yukle(link, fiyatNumber, guid, urunAdi, detail) {
  $.ajax({
    url: link,
    success: function (data) {
      let imageElement = $(data).find("#viewad-image");

      if (imageElement.length > 0) {
        let clonedImage = imageElement.clone();
        // clonedImage.css("height", (fiyatNumber > 100 ? "50px" : "150px"));
        clonedImage.addClass(fiyatNumber > 100 ? "image_size_normal" : "image_size_small");
        clonedImage.wrap('<a href="' + link + '" target="_blank"></a>');
        $(`#${guid}`).append(clonedImage.parent());
        
        let fullurl = "https://www.kleinanzeigen.de" + link;
        let urunAdi = $(data).find(".aditem-main--top--title").text().trim();
        let caption = 
        `${urunAdi}
        Fiyat: ${fiyatNumber}
        Link: ${fullurl}
        detay: ${detail}`;
        let images = clonedImage.map((i, el) => $(el).attr('src')).get();
        let captionWithLimit = caption.substring(0, 1024);
        send_msg(captionWithLimit, images);
      }
    },
  });
}

function fiyata_gore_style(fiyat, guid, fiyatNumber) {
  if (fiyat == "" || fiyat == "Zu verschenken")
    $(`#${guid}`).addClass("fiyat_bos");
  else if (fiyatNumber > 100)
    $(`#${guid}`).addClass("fiyat_100den_fazla");
  else if (fiyat == "VB")
    $(`#${guid}`).addClass("fiyat_vb");
  else if (fiyatNumber < 11)
    $(`#${guid}`).addClass("fiyat_10dan_az");
  else
    $(`#${guid}`).addClass("digerleri");
}

function scroll_isleri() {
  var scrolling = false; // Kaydırma işlemi başladığında true, durduğunda false olacak
  var animationFrame;

  // Smooth scroll düğmesine tıklama işlemini dinle
  $("#smooth-scroll-button").on("click", function (event) {
    if (!scrolling) { // Eğer kaydırma işlemi başlamadıysa
      scrolling = true; // Kaydırma işlemi başladığını işaretle
      // radius color green
      $("#smooth-scroll-button").css("background", "green");

      var scrollAmount = 0.002; // Sayfanın 0.2 birim yukarı kaydırılacak hız (isteğe bağlı olarak ayarlayabilirsiniz)

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

      // Scroll işlemi başlat
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

$(document).ready(function() {
  // sayfa yükleninice interval kadar bekle ve 100 scroll yap
  setTimeout(function() {
    window.scrollBy(0, 100);
  }, interval);
  scroll_isleri();
  // refresh 5 saniyede bir
  setInterval(function() {
    run(url)
  }, interval);
});
