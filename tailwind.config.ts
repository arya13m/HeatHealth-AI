import type { Config } from 'tailwindcss';
const config: Config={content:['./src/**/*.{js,ts,jsx,tsx,mdx}'],theme:{extend:{colors:{mint:'#D9F99D',leaf:'#16A34A',forest:'#0F3D2E',ink:'#10231D',cream:'#F8FAF4',heat:'#F97316',sky:'#0EA5E9'},boxShadow:{soft:'0 18px 50px rgba(16,35,29,.08)',card:'0 10px 30px rgba(16,35,29,.06)'}}},plugins:[]};
export default config;
