import assert from "node:assert/strict";
import { test } from "node:test";
import { teamUserSelection } from "./selection";
const user = {id:1,email:"staff@example.com",firstName:"Staff",lastName:""};
test("combobox item-selection input events cannot erase an explicit selected identity",()=>{
 const chosen=teamUserSelection({search:"sta",selected:null},{type:"select",user});
 assert.equal(chosen.selected?.id,1);
 assert.deepEqual(teamUserSelection(chosen,{type:"input",value:"",reason:"item-press"}),chosen);
 assert.deepEqual(teamUserSelection(chosen,{type:"input",value:"",reason:"none"}),chosen);
 assert.deepEqual(teamUserSelection(chosen,{type:"input",value:"other",reason:"input-change"}),{search:"other",selected:null});
 assert.deepEqual(teamUserSelection(chosen,{type:"input",value:"",reason:"clear-press"}),{search:"",selected:null});
});
