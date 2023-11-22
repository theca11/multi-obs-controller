"use strict";(self.webpackChunkmulti_obs_controller_docs=self.webpackChunkmulti_obs_controller_docs||[]).push([[125],{7599:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>u,contentTitle:()=>i,default:()=>m,frontMatter:()=>l,metadata:()=>s,toc:()=>p});var n=a(7462),r=(a(7294),a(3905)),o=a(3135);const l={hide_title:!0,hide_table_of_contents:!0,pagination_prev:null,pagination_next:null,title:"Raw WS Request"},i=void 0,s={unversionedId:"actions/raw-ws-request",id:"actions/raw-ws-request",title:"Raw WS Request",description:"<ActionPage",source:"@site/docs/actions/raw-ws-request.mdx",sourceDirName:"actions",slug:"/actions/raw-ws-request",permalink:"/multi-obs-controller/docs/actions/raw-ws-request",draft:!1,tags:[],version:"current",frontMatter:{hide_title:!0,hide_table_of_contents:!0,pagination_prev:null,pagination_next:null,title:"Raw WS Request"},sidebar:"docsSidebar"},u={},p=[{value:"Configuring a request",id:"configuring-a-request",level:3},{value:"Examples",id:"examples",level:4}],d={toc:p},c="wrapper";function m(e){let{components:t,...a}=e;return(0,r.kt)(c,(0,n.Z)({},d,a,{components:t,mdxType:"MDXLayout"}),(0,r.kt)(o.Z,{name:l.title,summary:"Send a raw websocket request compliant with the OBS Websockets protocol",description:"Send a raw websocket request compliant with the OBS Websockets protocol",settings:{"Request Type":"OBS Websockets protocol request type as string","Request Data":"OBS Websockets protocol request data as JSON object"},stateLabels:{on:"Default"},mdxType:"ActionPage"}),(0,r.kt)("h3",{id:"configuring-a-request"},"Configuring a request"),(0,r.kt)("p",null,"This is an advanced action that allows you to send a raw request supported by the ",(0,r.kt)("a",{parentName:"p",href:"https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#requests"},"OBS Websockets protocol"),".\nThe ",(0,r.kt)("inlineCode",{parentName:"p"},"Request Type")," field requires a valid string, and the ",(0,r.kt)("inlineCode",{parentName:"p"},"Request Data")," field requires a valid JSON object."),(0,r.kt)("h4",{id:"examples"},"Examples"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Action"),(0,r.kt)("th",{parentName:"tr",align:null},"Request Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Request Data"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"Set Scene to ",(0,r.kt)("inlineCode",{parentName:"td"},"Scene A")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"SetCurrentProgramScene")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'{"sceneName": "Scene A"}'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"Toggle Replay Buffer"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"ToggleReplayBuffer")),(0,r.kt)("td",{parentName:"tr",align:null})),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"Set Audio Monitor Type"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"SetInputAudioMonitorType")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'{"inputName": "Mic", "monitorType": "OBS_MONITORING_TYPE_MONITOR_ONLY"}'))))))}m.isMDXComponent=!0}}]);