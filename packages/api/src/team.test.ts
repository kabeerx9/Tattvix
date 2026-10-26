import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@tattvix/contracts";
import { createTeamApi, createTeamQueries, createTeamMutations, propertyScopeLabel, teamKeys, canSaveTeamMember } from "./team";
const member = { id: 5, user: { id: 7, email: "staff@example.com", firstName: "Staff", lastName: "Member" }, role: "RECEPTION", isActive: true, hasAllProperties: false, propertyIds: [9] } as const;

test("team requests preserve selected identity, scope and encoded organization path", async () => {
  const calls: {url:string;method?:string;body:unknown}[]=[];
  const api=createTeamApi(createApiClient({baseUrl:"https://example.test",getToken:async()=>"token",fetchImpl:async(url,init)=>{
    calls.push({url:String(url),method:init?.method,body:init?.body?JSON.parse(String(init.body)):null});
    return Response.json(String(url).includes("users/?") ? { users: [member.user] } : member);
  }}));
  await api.searchUsers("a/b", " STAFF@ ");
  await api.add("a/b", {userId:7,role:"RECEPTION",propertyIds:[9]});
  await api.update("a/b",5,{isActive:false});
  assert.equal(calls[0]?.url,"https://example.test/api/hotel/a%2Fb/team/users/?email=staff%40");
  assert.deepEqual(calls[1]?.body,{userId:7,role:"RECEPTION",propertyIds:[9]});
  assert.equal(calls[2]?.method,"PATCH");
  assert.deepEqual(calls[2]?.body,{isActive:false});
  assert.equal(createTeamQueries(api).search("org","ab").enabled,false);
  assert.notDeepEqual(teamKeys.search("a","staff"),teamKeys.search("b","staff"));
});

test("permission edits refresh authorization before team and discard old inactive hotel data", async()=>{
  const client=new QueryClient();
  for(const key of [["current-user","u"],teamKeys.list("org"),["platform-portfolio"],["hotel-stays","org","old"],["identity-documents"]])client.setQueryData(key,{});
  const api=createTeamApi(createApiClient({baseUrl:"https://example.test",getToken:async()=>null}));
  await createTeamMutations(api,client,"org").update.onSuccess();
  assert.equal(client.getQueryState(["current-user","u"])?.isInvalidated,true);
  assert.equal(client.getQueryState(teamKeys.list("org"))?.isInvalidated,true);
  assert.equal(client.getQueryData(["hotel-stays","org","old"]),undefined);
  assert.deepEqual(client.getQueryData(["identity-documents"]),{});
  client.clear();
});

test("server denials stay errors and form scopes reject duplicate IDs",async()=>{
  const api=createTeamApi(createApiClient({baseUrl:"https://example.test",getToken:async()=>null,fetchImpl:async()=>Response.json({error:"Last owner",code:"last_owner"},{status:409})}));
  await assert.rejects(api.update("org",5,{isActive:false}), (error)=>error instanceof ApiError && error.code==="last_owner");
  assert.equal(canSaveTeamMember("RECEPTION",[9,9],true),false);
  assert.equal(propertyScopeLabel({hasAllProperties:false,propertyIds:[9,10]},new Map([[9,"Lakeside"]])),"Lakeside, 1 other assigned property");
});

test("losing owner access clears team rosters and active operational queries",async()=>{
  const client=new QueryClient();
  client.setQueryData(["current-user","u"],{memberships:[]});
  client.setQueryData(teamKeys.list("org"),{privateTeamRoster:true});
  client.setQueryData(["hotel-stays","org","old"],{privateGuests:true});
  const observer=new QueryObserver(client,{queryKey:["hotel-stays","org","old"],queryFn:async()=>({privateGuests:true}),staleTime:Infinity});
  const unsubscribe=observer.subscribe(()=>{});
  const api=createTeamApi(createApiClient({baseUrl:"https://example.test",getToken:async()=>null}));
  await createTeamMutations(api,client,"org").update.onSuccess();
  assert.equal(client.getQueryData(teamKeys.list("org")),undefined);
  assert.equal(client.getQueryData(["hotel-stays","org","old"]),undefined);
  unsubscribe();
  client.clear();
});

test("team reads synchronize server subscription status into the account cache",async()=>{
 const client=new QueryClient();
 const trial={status:"TRIALING",entitled:true,trialEndsAt:"2026-10-25T00:00:00Z",paidUntil:null,entitledUntil:"2026-10-25T00:00:00Z",daysLeft:1};
 client.setQueryData(["current-user","u"],{memberships:[{organization:{slug:"org"},subscription:trial}]});
 const expired={...trial,status:"EXPIRED",entitled:false,daysLeft:0};
 const api=createTeamApi(createApiClient({baseUrl:"https://example.test",getToken:async()=>null,fetchImpl:async()=>Response.json({organization:{id:1,name:"Org",slug:"org"},properties:[],subscription:expired,members:[]})}));
 await client.fetchQuery(createTeamQueries(api).list("org"));
 const user=client.getQueryData<{memberships:{subscription:{status:string}}[]}>(["current-user","u"]);
 assert.equal(user?.memberships[0]?.subscription.status,"EXPIRED");
 client.clear();
});
