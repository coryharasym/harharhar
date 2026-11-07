import React from 'react';
import {createRoot} from 'react-dom/client';
import Arcade from '../app/page';
import {configureApiOrigin} from '../lib/api';
import '../app/globals.css';
if(import.meta.env.PROD)configureApiOrigin('https://har-har-har.cooory.chatgpt.site');
createRoot(document.getElementById('root')!).render(<Arcade/>);
