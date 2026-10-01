/*
 * 10010 accountListData ad response for Quantumult X
 */

const body = JSON.stringify({
  "imgIndex": "0",
  "adv": {
    "startup_adv": {
      "advCntList": [],
      "buttonList": []
    }
  },
  "respCode": "0000"
});

$done({
  status: "HTTP/1.1 200 OK",
  body
});
