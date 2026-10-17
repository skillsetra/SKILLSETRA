"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";

export const LANGUAGES=[
 {id:"English",label:"English",native:"English",code:"en"},
 {id:"Hindi",label:"Hindi",native:"हिन्दी",code:"hi"},
 {id:"Gujarati",label:"Gujarati",native:"ગુજરાતી",code:"gu"},
 {id:"Spanish",label:"Spanish",native:"Español",code:"es"},
];

type Dict=Record<string,string>;
const dictionaries:Record<string,Dict>={
 English:{dashboard:"Dashboard",competencies:"Competencies",challenges:"Challenges",projects:"Projects",github:"GitHub",career:"Career",assessment:"Assessment",learn:"Learn",roadmap:"Roadmap",interview:"Interviewer",settings:"Settings",profile:"Account",search:"Search SKILLSETRA…",signout:"Sign out",language:"Language",aiCoach:"AI Coach",connected:"Connected",save:"Save changes",open:"Open",analyze:"Analyze",loading:"Loading your workspace…",noResults:"No results found"},
 Hindi:{dashboard:"डैशबोर्ड",competencies:"क्षमताएँ",challenges:"चैलेंज",projects:"प्रोजेक्ट",github:"GitHub",career:"करियर",assessment:"मूल्यांकन",learn:"सीखें",roadmap:"रोडमैप",interview:"इंटरव्यू",settings:"सेटिंग्स",profile:"अकाउंट",search:"SKILLSETRA में खोजें…",signout:"साइन आउट",language:"भाषा",aiCoach:"AI कोच",connected:"कनेक्टेड",save:"बदलाव सहेजें",open:"खोलें",analyze:"विश्लेषण",loading:"आपका वर्कस्पेस लोड हो रहा है…",noResults:"कोई परिणाम नहीं मिला"},
 Gujarati:{dashboard:"ડેશબોર્ડ",competencies:"ક્ષમતાઓ",challenges:"ચેલેન્જ",projects:"પ્રોજેક્ટ્સ",github:"GitHub",career:"કારકિર્દી",assessment:"મૂલ્યાંકન",learn:"શીખો",roadmap:"રોડમેપ",interview:"ઇન્ટરવ્યૂ",settings:"સેટિંગ્સ",profile:"એકાઉન્ટ",search:"SKILLSETRA માં શોધો…",signout:"સાઇન આઉટ",language:"ભાષા",aiCoach:"AI કોચ",connected:"કનેક્ટેડ",save:"ફેરફારો સાચવો",open:"ખોલો",analyze:"વિશ્લેષણ",loading:"તમારું વર્કસ્પેસ લોડ થઈ રહ્યું છે…",noResults:"કોઈ પરિણામ મળ્યું નથી"},
 Spanish:{dashboard:"Panel",competencies:"Competencias",challenges:"Retos",projects:"Proyectos",github:"GitHub",career:"Carrera",assessment:"Evaluación",learn:"Aprender",roadmap:"Ruta",interview:"Entrevista",settings:"Ajustes",profile:"Cuenta",search:"Buscar en SKILLSETRA…",signout:"Cerrar sesión",language:"Idioma",aiCoach:"Coach de IA",connected:"Conectado",save:"Guardar cambios",open:"Abrir",analyze:"Analizar",loading:"Cargando tu espacio…",noResults:"No se encontraron resultados"},
};

type Ctx={language:string;setLanguage:(v:string)=>void;t:(key:string)=>string;languages:typeof LANGUAGES};
const C=createContext<Ctx>({language:"English",setLanguage:()=>{},t:(k)=>k,languages:LANGUAGES});
export function I18nProvider({children}:{children:React.ReactNode}){
 const [language,setLanguageState]=useState("English");
 useEffect(()=>{try{const saved=localStorage.getItem("skillsetra_language");if(saved&&dictionaries[saved])setLanguageState(saved)}catch{/* Storage can be disabled in strict browser contexts. */}},[]);
 useEffect(()=>{try{localStorage.setItem("skillsetra_language",language)}catch{/* Language still works for this page session. */}document.documentElement.lang=LANGUAGES.find(x=>x.id===language)?.code||"en";},[language]);
 const setLanguage=(v:string)=>{if(dictionaries[v])setLanguageState(v)};
 const t=(key:string)=>dictionaries[language]?.[key]||dictionaries.English[key]||key;
 return <C.Provider value={{language,setLanguage,t,languages:LANGUAGES}}>{children}</C.Provider>;
}
export const useI18n=()=>useContext(C);
