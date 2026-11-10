/* Daten: Nationen, Namen, Ereignistexte */
const V=(a,b,c)=>`linear-gradient(90deg,${a} 0 33.4%,${b} 33.4% 66.7%,${c} 66.7%)`;
const H=(a,b,c)=>`linear-gradient(${a} 0 33.4%,${b} 33.4% 66.7%,${c} 66.7%)`;
const H2=(a,b)=>`linear-gradient(${a} 0 50%,${b} 50%)`;
const NAT={
 DE:{n:'Deutschland',g:'DACH',f:H('#222','#d22','#fc0'),nm:['Kalle','Jan','Lena','Uwe','Sven']},
 AT:{n:'Österreich',g:'DACH',f:H('#d22','#fff','#d22'),nm:['Franz','Sepp','Hannes']},
 CH:{n:'Schweiz',g:'DACH',f:'radial-gradient(#fff 0 18%,#d22 19%)',nm:['Beat','Reto','Urs']},
 RS:{n:'Serbien',g:'Ex-Jugoslawien',f:H('#c33','#2a4a9a','#fff'),nm:['Dragan','Milan','Zoran']},
 HR:{n:'Kroatien',g:'Ex-Jugoslawien',f:H('#d22','#fff','#2a4a9a'),nm:['Ivo','Marko','Luka']},
 BA:{n:'Bosnien-Herz.',g:'Ex-Jugoslawien',f:'linear-gradient(to top right,transparent 50%,#fc0 50%) 30% 0/45% 100% no-repeat,#2a4a9a',nm:['Mirza','Senad','Kemal']},
 SI:{n:'Slowenien',g:'Ex-Jugoslawien',f:H('#fff','#2a4a9a','#d22'),nm:['Janez','Matej']},
 MK:{n:'Nordmazedonien',g:'Ex-Jugoslawien',f:H2('#d22','#fc0'),nm:['Goran','Blagoj']},
 ME:{n:'Montenegro',g:'Ex-Jugoslawien',f:H2('#b22','#d9a520'),nm:['Nikola','Stefan']},
 XK:{n:'Kosovo',g:'Ex-Jugoslawien',f:H2('#2a4a9a','#2a4a9a'),nm:['Arben','Besim']},
 SZ:{n:'Sandschak',g:'Ex-Jugoslawien',f:"#fafafa url(assets/flags/flag_sz.png) center/100% 100% no-repeat",nm:['Emir','Adnan','Samir','Elvir']},
 BG:{n:'Bulgarien',g:'Südost',f:H('#fff','#2a9a4a','#d22'),nm:['Georgi','Ivan','Petar']},
 RO:{n:'Rumänien',g:'Südost',f:V('#2a4a9a','#fc0','#d22'),nm:['Andrei','Mihai','Ionut']},
 MD:{n:'Moldawien',g:'Südost',f:V('#2a4a9a','#fc0','#d22'),nm:['Vasile','Sergiu']},
 AL:{n:'Albanien',g:'Südost',f:H2('#d22','#d22'),nm:['Besnik','Ilir']},
 GR:{n:'Griechenland',g:'Südost',f:H('#2a6ad4','#fff','#2a6ad4'),nm:['Nikos','Giorgos']},
 HU:{n:'Ungarn',g:'Mitteleuropa',f:H('#d22','#fff','#2a9a4a'),nm:['Laszlo','Gabor','Zoltan']},
 PL:{n:'Polen',g:'Mitteleuropa',f:H2('#fff','#d22'),nm:['Tomasz','Piotr','Marek']},
 CZ:{n:'Tschechien',g:'Mitteleuropa',f:H2('#fff','#d22'),nm:['Pavel','Jakub']},
 SK:{n:'Slowakei',g:'Mitteleuropa',f:H('#fff','#2a4a9a','#d22'),nm:['Peter','Martin']},
 UA:{n:'Ukraine',g:'Osteuropa',f:H2('#2a6ad4','#fc0'),nm:['Taras','Oleksandr','Bohdan']},
 BY:{n:'Weißrussland',g:'Osteuropa',f:H('#fff','#d22','#fff'),nm:['Sergej','Aleksei']},
 RU:{n:'Russland',g:'Osteuropa',f:H('#fff','#2a4a9a','#d22'),nm:['Dmitri','Igor']},
 LT:{n:'Litauen',g:'Osteuropa',f:H('#fc0','#2a9a4a','#d22'),nm:['Jonas','Tadas']},
 LV:{n:'Lettland',g:'Osteuropa',f:H('#a02838','#fff','#a02838'),nm:['Janis','Andris']},
 EE:{n:'Estland',g:'Osteuropa',f:H('#2a6ad4','#222','#fff'),nm:['Toomas','Mart']}};
const GROUPS=['DACH','Ex-Jugoslawien','Südost','Mitteleuropa','Osteuropa'];
const BASEPOOL=['DE','DE','DE','AT','PL','RO','BG','RS','HU','UA','HR','BA'];
const LASTI='ABCDEFGHKLMNPRSTWZ';
const TRAITS=[
 ['Frühaufsteher','+Tempo bei gutem Wetter'],['Akkurat','weniger Mängel'],['Schnelle Hände',''],['Ausdauernd','seltener krank'],
 ['Günstig','Lohn -8 %'],['Teamplayer','Laune der Kolonne +'],['Sturkopf','Laune sinkt schneller'],['Kaffeejunkie','mag die Kaffeemaschine'] ];
const FIRMNAMES=['Musterbau Nord GmbH','Beispiel & Söhne Rohbau','Fantasie-Hochbau AG','Nordlicht Bau KG','Hansa-Beispiel Hochbau','Bauhütte Mustermann'];
const BAUHERREN=['Familie Wagner','Familie Brandt','Herr und Frau Keller','Familie Yilmaz','Familie Novak','Familie Hoffmann','Herr Petrov','Familie Lindqvist','Frau Albrecht','Familie Schäfer','Herr Kovač','Familie Ostermann'];
['MK','XK','AL','SZ'].forEach(k=>{NAT[k].f=`#fafafa url(assets/flags/flag_${k.toLowerCase()}.png) center/100% 100% no-repeat`;});
const ALLNAT=Object.keys(NAT);
