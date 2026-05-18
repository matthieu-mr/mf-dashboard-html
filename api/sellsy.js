import axios from 'axios';
import credentialFile from '../00-perso/credentials-sellsy.json' with { type: 'json' };
//import * as gsheetAction from '../api-global/googleSheetAPI.js'


let getToken = async () => {
  const getBearer = await axios({
    method: 'POST',
    url: 'https://login.sellsy.com/oauth2/access-tokens',
    headers: credentialFile,
    data: credentialFile
  });
  let token = getBearer.data.access_token

  return token
}


//let token=getToken()
let getOneCompanyByEmail = async (email) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/companies/search',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {

        "filters": {
          "email": email,
        }

      }
    });

    // console.log(response.data);
    info = response.data.data
  } catch (error) {
    // console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}



const   getListInvoicesForACompany = async (idCompany) => {
  const token = await getToken();
  let info = null;

  try {
    const response = await axios({
      method: "POST",
      url: "https://api.sellsy.com/v2/invoices/search?embed[]=cf.174968",
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json",
      },
      data: {
        filters: {
          related_objects: [
            {
              type: "company",
              id: idCompany,
            },
          ],
        },
      },
    });

    info = response.data?.data ?? null;
  } catch (error) {
    info = null;
  }

  return info;
};


let getOneCompanyByID = async (id) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/companies/${id}?embed[]=opportunities&embed[]=invoices&embed[]=estimates`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}






let getOneCompanyByID2 = async (id) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/companies/${id}?embed[]=opportunities&embed[]=invoices&embed[]=estimates`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}

let getActivitiesByIDCompany = async (id) => {
  const token = await getToken();

  const body = {
    filters: {
      companies: { match: [id], not_match: [] }
    }
  };

  try {
    const { data } = await axios.post(
      "https://api.sellsy.com/v2/activities/crm/search?order=date&direction=desc&limit=10",
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "cache-control": "no-cache"
        }
      }
    );

    return data;
  } catch (error) {
    return null;
  }
};


//let token=getToken()
let getOneOpportByID = async (opportID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/opportunities/${opportID}?embed[]=cf.183646&embed[]=cf.174968&embed[]=cf.203573&embed[]=cf.197746&embed[]=cf.197744&embed[]=cf.113397`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    // console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}



//let token=getToken()
let getListOpportByCompanyId = async (opportID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/opportunities/${opportID}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    // console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}



//let token=getToken()
let getOneOpportCustomFieldsByID = async (opportID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/opportunities/${opportID}/custom-fields?limit=100`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    // console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}



//let token=getToken()
let getOneEstimateByID = async (estimateID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/estimates/${estimateID}?embed[]=cf.174968&embed[]=cf.183645&embed[]=cf.83728`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    // console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}


//let token=getToken()
let getOneInvoiceByID = async (invoicesID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/invoices/${invoicesID}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    // console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info

}


//let token=getToken()
//let token=getToken()
let getStaffByID = async (id) => {
  if (id === null) {
    return "";
  }

  let token = await getToken();
  //let email="zweideckautomobiles@gmail.com"
  let info = "";

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/staffs/${id}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data;
  } catch (error) {
    // console.error(error);
    info = "";
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info;
}


let getCatalog = async (id) => {
  if (id === null) {
    return "";
  }

  let token = await getToken();
  //let email="zweideckautomobiles@gmail.com"
  let info = "";

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/items?limit=1000`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data;
  } catch (error) {
    // console.error(error);
    info = "";
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info;
}


let getStaffAll = async (offset) => {

  let token = await getToken();
  //let email="zweideckautomobiles@gmail.com"
  let info = "";

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/staffs?limit=100`,
      //     url: `https://api.sellsy.com/v2/staffs?limit=100`,

      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data;
  } catch (error) {
    // console.error(error);
    info = "";
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info;
}




//let token=getToken()
let getOpportInStepWithFilter = async (pipelineID, stepID, filterID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/opportunities/search?limit=10',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "pipeline": [pipelineID],
          "step": [stepID],
          "favourite_filter": filterID
        }
      }
    });

    // console.log(response.data);
    info = response.data
    return info
  } catch (error) {
    // console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}

//let token=getToken()
// sellsy_consult.js
const getOpportWithFilter = async (filterID, dateDebut, dateFin, offset = null, limit = 100) => {
  try {
    if (!dateDebut || !dateFin) throw new Error("dateDebut/dateFin requis");

    const start = `${dateDebut}T00:00:00+01:00`;
    const end = `${dateFin}T23:59:59+01:00`; // inclusif

    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/opportunities/search");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.183646");
    url.searchParams.append("embed[]", "cf.174968");
    url.searchParams.append("embed[]", "cf.183645");
    url.searchParams.append("embed[]", "cf.83728");

    if (offset) url.searchParams.set("offset", offset);

    const response = await axios({
      method: "POST",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      },
      data: {
        filters: {
          favourite_filter: filterID,
          created: { start, end },   // ← ajout de la fenêtre de dates
          // pipeline: [87728],      // toujours possible en plus si tu veux
        },
      },
    });

    return response.data; // { data: [...], pagination: {...} }
  } catch (error) {
    console.error("Erreur dans getOpportWithFilter:", error.response?.data || error.message);
    return null;
  }
};


const getDevisAll = async (offset = null, limit = 100) => {
  try {
    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/estimates");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.174968"); // liste media
    url.searchParams.append("embed[]", "cf.183645"); // source devis
    url.searchParams.append("embed[]", "cf.83728"); // source date Validation
    url.searchParams.append("embed[]", "cf.83732"); // source date mise en ligne 
    // url.searchParams.append("embed[]", "opportunities");

    if (offset) {
      url.searchParams.set("offset", String(offset));
    }

    const response = await axios({
      method: "GET",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      }
    });

    return response.data;
  } catch (error) {
    console.error("Erreur dans getDevisAll:", error.response?.data || error.message);
    return null;
  }
};




const getInvoicesAll = async (offset = null, limit = 100) => {
  try {
    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/invoices");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.174968"); // liste media
    url.searchParams.append("embed[]", "cf.183645"); // source devis
    url.searchParams.append("embed[]", "cf.83728"); // source date Validation
    url.searchParams.append("embed[]", "cf.83732"); // source date mise en ligne 
    // url.searchParams.append("embed[]", "opportunities");

    if (offset) {
      url.searchParams.set("offset", String(offset));
    }

    const response = await axios({
      method: "GET",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      }
    });

    return response.data;
  } catch (error) {
    console.error("Erreur dans getDevisAll:", error.response?.data || error.message);
    return null;
  }
};






const getCompaniesAll = async (offset = null, limit = 100) => {
  try {
    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/companies?embed[]=opportunities&embed[]=invoices&embed[]=estimates");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.174968"); // liste media
    url.searchParams.append("embed[]", "cf.183645"); // source devis
    url.searchParams.append("embed[]", "cf.83728"); // source date Validation
    url.searchParams.append("embed[]", "cf.83732"); // source date mise en ligne 

url.searchParams.append("embed[]", "cf.221801"); // mk google 1
url.searchParams.append("embed[]", "cf.221802"); // mk google 2 
url.searchParams.append("embed[]", "cf.221803"); // mk google 3


    // url.searchParams.append("embed[]", "opportunities");

    if (offset) {
      url.searchParams.set("offset", String(offset));
    }

    const response = await axios({
      method: "GET",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      }
    });

    return response.data;
  } catch (error) {
    console.error("Erreur dans getDevisAll:", error.response?.data || error.message);
    return null;
  }
};



const getEstimatesAll =  async (filterID, dateDebut, dateFin, offset = null, limit = 100) => {
  try {
    if (!dateDebut || !dateFin) throw new Error("dateDebut/dateFin requis");

    const start = `${dateDebut}T00:00:00+01:00`;
    const end = `${dateFin}T23:59:59+01:00`; // inclusif

    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/invoices/search");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.183646");
    url.searchParams.append("embed[]", "cf.174968");
    url.searchParams.append("embed[]", "cf.183645");
    url.searchParams.append("embed[]", "cf.83728");

    if (offset) url.searchParams.set("offset", offset);

    const response = await axios({
      method: "POST",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      },
      data: {
        filters: {
          created: { start, end },   // ← ajout de la fenêtre de dates
          // pipeline: [87728],      // toujours possible en plus si tu veux
        },
      },
    });

    return response.data; // { data: [...], pagination: {...} }
  } catch (error) {
    console.error("Erreur dans getOpportWithFilter:", error.response?.data || error.message);
    return null;
  }
};



const getOpportLastUpdated30 =  async (dateDebut, dateFin, offset = null, limit = 100) => {
  try {
    if (!dateDebut || !dateFin) throw new Error("dateDebut/dateFin requis");

    const start = `${dateDebut}T00:00:00+01:00`;
    const end = `${dateFin}T23:59:59+01:00`; // inclusif

    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/opportunities/search");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.183646");
    url.searchParams.append("embed[]", "cf.174968");
    url.searchParams.append("embed[]", "cf.183645");
    url.searchParams.append("embed[]", "cf.83728");

    if (offset) url.searchParams.set("offset", offset);

    const response = await axios({
      method: "POST",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      },
data: {
  filters: {
    updated_status: { start, end },
        step: [
          835001,
          374910,
          634070,
          792242,
          834934,
          834945,
          834954,
          834961,
          377673,
          636313,
          634071,
          792243,
          834935,
          834946,
          834955,
          389466,
          636314,
          801285,
          792244,
          792245,
          834968,
          834947,
          834956,
          834962,
          374912
        ]
      },
    },
    });

    return response.data; // { data: [...], pagination: {...} }
  } catch (error) {
    console.error("Erreur dans getOpportWithFilter:", error.response?.data || error.message);
    return null;
  }
};





const getClientAll= async (filterID, offset = null, limit = 100) => {
  try {

    const token = await getToken();

    const url = new URL("https://api.sellsy.com/v2/companies");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("embed[]", "cf.221801");
    url.searchParams.append("embed[]", "cf.221802");
    url.searchParams.append("embed[]", "cf.221803");
    url.searchParams.append("embed[]", "cf.83728");

    if (offset) url.searchParams.set("offset", offset);

    const response = await axios({
      method: "GET",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json"
      },
      data: {
        filters: {
          favourite_filter: 621981,
        },
      },
    });

    return response.data; // { data: [...], pagination: {...} }
  } catch (error) {
    console.error("Erreur dans getOpportWithFilter:", error.response?.data || error.message);
    return null;
  }
};



/*
// appel test
getDevisAll().then(data => {
  console.log("🚀 ~ getDevisAll ~ data:", data);
});
*/

let getOpportWithFilterCompany = async (typeFiche, idCompany) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.sellsy.com/v2/${typeFiche}/search?limit=100`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "related_objects": [
            {
              "type": "company",
              "id": idCompany
            }
          ]
        }
      }
    });

    // console.log("responser,",response);
    info = await response.data
    return info
  } catch (error) {
    console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}

const getOpportWithFilterUpdate30 = async (typeFiche, idCompany) => {
  const token = await getToken();
  let info = "";

  try {
    const response = await axios({
      method: "POST",
      url: "https://api.sellsy.com/v2/opportunities/search?limit=100",
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json",
      },
      data: {
        filters: {
          updated_status: {
            start: "2025-12-01T00:00:00+01:00",
            end: "2025-12-31T00:00:00+01:00",
          },
          step: [
            835001, 374910, 634070, 792242, 834934, 834945, 834954, 834961,
            377673, 636313, 634071, 792243, 834935, 834946, 834955, 389466,
            636314, 801285, 792244, 792245, 834968, 834947, 834956, 834962,
            374912,
          ],
        },
      },
    });

    info = response.data;
    return info;
  } catch (error) {
    console.error(error);
    info = null;
  }

  return info;
};



let getInvoicestWithFilter = async (filterID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/invoices/search?limit=100',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "favourite_filter": filterID
        }
      }
    });

    // console.log(response.data);
    info = response.data
    return info
  } catch (error) {
    // console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}



let getInvoicesFromCompany = async (filterID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/invoices/search?limit=100',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "related_objects": [
            {
              "type": "company",
              "id": filterID
            }
          ]
        }
      }
    });

    // console.log(response.data);
    info = response.data
    return info
  } catch (error) {
    // console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}



//let token=getToken()
let getestimatesWithFilter = async (filterID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/estimates/search?limit=100',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          "favourite_filter": filterID
        }
      }
    });

    // console.log("responser,",response);
    info = await response.data
    return info
  } catch (error) {
    console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}


//let token=getToken()
let getInvoicesWithFilter = async (filterID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/invoices/search?limit=100',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          "favourite_filter": filterID
        }
      }
    });

    // console.log("responser,",response);
    info = await response.data
    return info
  } catch (error) {
    console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}



let getOneContactByID = async (id) => {
  if (id === null) {
    return "";
  }

  let token = await getToken();
  //let email="zweideckautomobiles@gmail.com"
  let info = "";

  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/contacts/${id}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });

    // console.log(response.data);
    info = response.data;
  } catch (error) {
    console.error(error);
    //info = "";
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info;
}

//let token=getToken()
let getInvoiceByData = async (filterID) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/invoices/search',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          "number": filterID
        }
      }
    });

    // console.log("responser,",response);
    info = await response.data
    return info
  } catch (error) {
    console.error(error);
    info = null
  }


  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)

  return info

}

//let token=getToken()
let getOpportFromClient = async (companyId) => {

  // https://www.sellsy.com/thirds/client/43168168/opportunity?contextId=false

  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/opportunities/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          // "favourite_filter":505303,
          "related_objects": [{ "type": "company", "id": parseInt(companyId) }], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response.data
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info
}


//let token=getToken()
let getEstimatesFromClient = async (companyId) => {
  // https://www.sellsy.com/thirds/client/43168168/opportunity?contextId=false
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/estimates/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          // "favourite_filter":505303,
          "related_objects": [{ "type": "company", "id": parseInt(companyId) }], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response.data
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info
}







let getContactList = async (id) => {
  let token = await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info = ""
  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/clients`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },

    });

    // console.log(response.data);
    info = response.data
  } catch (error) {
    info = null
  }
  return info
}

let getContactListWithFilter = async (idFiltre) => {
  let token = await getToken()
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      //url: 'https://api.sellsy.com/v2/contacts/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      url: 'https://api.sellsy.com/v2/companies/search?limit=3',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          "favourite_filter": idFiltre,
          // "related_objects":[{"type": "company","id": parseInt(companyId)}], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info
}


let getCompanyListWithOpportWithFilter = async (idFiltre) => {
  let token = await getToken()
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      //url: 'https://api.sellsy.com/v2/contacts/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      url: 'https://api.sellsy.com/v2/companies/search?limit=3&embed[]=cf.174968&embed[]=cf.82718&embed[]=opportunities&embed[]=invoices&embed[]=estimates',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          "favourite_filter": idFiltre,
          // "related_objects":[{"type": "company","id": parseInt(companyId)}], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info
}

//let token=getToken()
let getListOpportByCompanyID = async (companyId) => {
  let token = await getToken()
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/opportunities/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "related_objects": [{ "type": "company", "id": parseInt(companyId) }], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  return "ok"
}


let getListEstimateByCompanyID = async (companyId) => {
  let token = await getToken()
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/estimates/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "related_objects": [{ "type": "company", "id": parseInt(companyId) }], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  return "ok"
}

let getEstimateFromMarketingWithFilter = async (idFiltre) => {
  let token = await getToken()
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      //url: 'https://api.sellsy.com/v2/contacts/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      url: 'https://api.sellsy.com/v2/companies/search?limit=3&embed[]=cf.174968&embed[]=cf.82718&embed[]=opportunities&embed[]=invoices&embed[]=estimates',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          // "pipeline":[87728],
          "favourite_filter": idFiltre,
          "related_objects": [{ "type": "company", "id": parseInt(companyId) }], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info
}


// Remplace par ton vrai getToken si déjà défini ailleurs
// import { getToken } from "./auth.js";

const getListCompanies = async ({
  favouriteFilter = null,
  limit = 100,
  offset = null,
  embeds = [
    "opportunities",
    "invoices",
    "estimates",
    "cf.174968",
    "cf.82718",
    "cf.223757",
    "cf.221801",
    "cf.221802",
    "cf.221803"
  ],
} = {}) => {
  const token = await getToken();

  const url = new URL("https://api.sellsy.com/v2/companies/search");
  url.searchParams.set("limit", String(limit));

  if (offset !== null && offset !== undefined) {
    url.searchParams.set("offset", String(offset));
  }

  for (const e of embeds) {
    url.searchParams.append("embed[]", e);
  }

  const data = favouriteFilter
    ? { filters: { favourite_filter: favouriteFilter } }
    : { filters: {} };

  try {
    console.log("🌐 URL appelée :", url.toString());
    console.log("📤 Body envoyé :", JSON.stringify(data, null, 2));

    const response = await axios({
      method: "POST",
      url: url.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        "Content-Type": "application/json",
      },
      data,
    });

    console.log("📥 Pagination reçue :", JSON.stringify(response.data?.pagination || {}, null, 2));

    return response.data;
  } catch (error) {
    console.error("❌ getListCompanies:", error.response?.data || error.message);
    return null;
  }
};



/* ---------------- */

let getEstimatesFromNumber = async (number) => {
  let token = await getToken()
  let info = ""

  try {
    const response = await axios({
      method: 'POST',
      //url: 'https://api.sellsy.com/v2/contacts/search?limit=100&embed[]=cf.174968&embed[]=cf.82718',
      url: 'https://api.sellsy.com/v2/estimates/search?limit=3&embed[]=cf.174968&embed[]=cf.82718&embed[]=opportunities&embed[]=invoices&embed[]=estimates',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "number": idFiltre,
          // "related_objects":[{"type": "company","id": parseInt(companyId)}], //43168168
        }
      }
    });

    // console.log("responser,",response);
    info = await response
    return info.data
  } catch (error) {
    console.error(error);
    info = null
  }

  // console.log("🚀 ~ file: sellsy2api.js:102 ~ getOneCompanyByEmail ~ info:", info)
  return info
}


const getCompanyFromName = async (name) => {
  const token = await getToken();
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/companies/search?limit=3&embed[]=cf.174968&embed[]=cf.82718&embed[]=opportunities&embed[]=invoices&embed[]=estimates',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
        "filters": {
          "name": name,
        }
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching company data:", error);
    return null;
  }
};

const getCompanyFromFilter = async (idFilter) => {
  try {
    const token = await getToken();

    const response = await axios({
      method: 'POST',
      url: 'https://api.sellsy.com/v2/companies/search?limit=100&embed[]=opportunities&embed[]=invoices&embed[]=estimates',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
      },
      data: {
        filters: {
          favourite_filter: idFilter,
        }
      }
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching company data:", error.response?.data || error.message);
    return null;
  }
};

const getListCustomFields = async (name) => {
  const token = await getToken();
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://api.sellsy.com/v2/custom-fields?limit=100&offset=WyIyODUyNjYiXQ==',
      // url: 'https://api.sellsy.com/v2/custom-fields?limit=100',

      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching company data:", error);
    return null;
  }
};



const  getmodels= async (name) => {
  const token = await getToken();
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://api.sellsy.com/v2/documents/models',
      // url: 'https://api.sellsy.com/v2/custom-fields?limit=100',

      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },

    });
    console.log(response.data[0]. payment_conditions_acceptance)
    return response.data;
  } catch (error) {
    console.error("Error fetching company data:", error);
    return null;
  }
};





const getOneCustomFieldsById = async (id) => {
  const token = await getToken();
  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.sellsy.com/v2/custom-fields/${id}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching company data:", error);
    return null;
  }
};


const getLabelFromCustomField = (opport) => {
  try {
    const customField = opport._embed.custom_fields[1]; // custom field "Id client/Id prospect"
    const selectedId = parseInt(customField.value); // exemple : 3742076
    const labelItem = customField.parameters.items.find(item => item.id === selectedId);
    return labelItem ? labelItem.label : null;
  } catch (e) {
    console.warn("⚠️ Impossible de récupérer le label du champ personnalisé :", e.message);
    return null;
  }
}


const getSelectedItemFromCustomField = (customField) => {
  if (
    !customField ||
    !customField.parameters ||
    !Array.isArray(customField.parameters.items)
  ) {
    return null;
  }

  const valueToMatch = customField.value;
  return customField.parameters.items.find(item => item.id === valueToMatch) || null;
};



const getAllPipelines = async () => {
  const token = await getToken();
  let pipelines = [];

  try {
    const response = await axios({
      method: 'GET',
      url: 'https://api.sellsy.com/v2/opportunities/pipelines',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      }
    });

    const rawData = response.data?.data || [];

    pipelines = rawData.map(p => ({
      id: p.id,
      name: p.name
    }));

  } catch (error) {
    console.error("Erreur lors de la récupération des pipelines :", error.message);
    pipelines = null;
  }

  return pipelines;
};





const getFlatPipelinesAndSteps = async () => {
  const token = await getToken();
  const flatList = [];

  try {
    // Récupère tous les pipelines
    const pipelinesResponse = await axios({
      method: 'GET',
      url: 'https://api.sellsy.com/v2/opportunities/pipelines',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      }
    });

    const pipelines = pipelinesResponse.data?.data || [];

    for (const pipeline of pipelines) {
      try {
        // Récupère les étapes pour chaque pipeline
        const stepsResponse = await axios({
          method: 'GET',
          url: `https://api.sellsy.com/v2/opportunities/pipelines/${pipeline.id}/steps`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'cache-control': 'no-cache',
          }
        });

        const steps = stepsResponse.data?.data || [];

        for (const step of steps) {
          flatList.push({
            pipeline_id: pipeline.id,
            pipeline: pipeline.name,
            step_id: step.id,
            step_name: step.name
          });
        }

      } catch (stepError) {
        console.error(`Erreur pour pipeline ${pipeline.name} :`, stepError.message);
      }
    }

  } catch (error) {
    console.error("Erreur lors de la récupération des pipelines :", error.message);
    return null;
  }

  return flatList;
};

// sellsy_consult.js
const getListOpportByDate = async ({ dateDebut, dateFin, offset = null, limit = 100 }) => {
  if (!dateDebut || !dateFin) throw new Error("dateDebut/dateFin requis");

  const start = `${dateDebut}T00:00:00+01:00`;
  const end = `${dateFin}T23:59:59+01:00`; // inclusif sur la fin de journée

  const url = new URL("https://api.sellsy.com/v2/opportunities/search");
  url.searchParams.set("limit", String(limit));
  url.searchParams.append("embed[]", "cf.183646");
  url.searchParams.append("embed[]", "cf.174968");
  url.searchParams.append("embed[]", "cf.82718");



  if (offset) url.searchParams.set("offset", offset);

  const token = await getToken();

  const body = { filters: { created: { start, end } } };

  // DEBUG utile si ça re-plante:
  // console.log("URL:", url.toString());
  // console.log("BODY:", JSON.stringify(body));

  const { data } = await axios({
    method: "POST",
    url: url.toString(),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: body,
  });

  return data; // { data: [...], pagination: { offset, ... } }
};



// sellsy_consult.js
const getListEstimatesByDate = async ({ dateDebut, dateFin, offset = null, limit = 100 }) => {
  if (!dateDebut || !dateFin) throw new Error("dateDebut/dateFin requis");

  const start = `${dateDebut}T00:00:00+01:00`;
  const end = `${dateFin}T23:59:59+01:00`; // inclusif sur la fin de journée

  const url = new URL("https://api.sellsy.com/v2/estimates/search");
  url.searchParams.set("limit", String(limit));
  url.searchParams.append("embed[]", "cf.183645");
  url.searchParams.append("embed[]", "cf.174968");
  url.searchParams.append("embed[]", "cf.83728"); // 83728

  if (offset) url.searchParams.set("offset", offset);

  const token = await getToken();

  const body = { filters: { created: { start, end } } };

  // DEBUG utile si ça re-plante:
  // console.log("URL:", url.toString());
  // console.log("BODY:", JSON.stringify(body));

  const { data } = await axios({
    method: "POST",
    url: url.toString(),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: body,
  });

  console.log("🚀 ~ getListEstimatesByDate ~ data:", data)
  return data; // { data: [...], pagination: { offset, ... } }
};

// sellsy_consult.js (ajout)
const getListEstimatesByOffset = async ({ offset = 1, limit = 100 }) => {
  const url = new URL("https://api.sellsy.com/v2/estimates/search");
  url.searchParams.set("limit", String(limit));
  url.searchParams.append("embed[]", "cf.183645"); // liste medias
  url.searchParams.append("embed[]", "cf.174968"); // Source Devis
  url.searchParams.append("embed[]", "cf.83732"); // date mise en ligne
  url.searchParams.append("embed[]", "cf.83728"); // Date validation Devis



  if (offset !== null && offset !== undefined) {
    url.searchParams.set("offset", String(offset)); // offset numérique voulu
  }

  const token = await getToken();

  // Corps minimal: aucun filtre (mais structure attendue par Sellsy)
  const body = { filters: {} };

  const { data } = await axios({
    method: "POST",
    url: url.toString(),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: body,
  });

  return data; // { data: [...], pagination?: {...} }
};



/*
getOneCustomFieldsById(82718).then(data => {
  console.log("🚀 -----------:", data.parameters);
});


/*






getListOpportByDate("2025-01-01", "2025-08-10").then(data => {
  console.log("🚀 Opportunités:", data);
});
*/

// Exemple d'appel :


/*
getFlatPipelinesAndSteps(183646).then(value => {
console.log("🚀 ~ getOneCustomFieldsById ~ value:", value)

  let dataSend=[]


  for(let i =0;i<value.length;i++){
   dataSend.push([value[i].pipeline_id,value[i].pipeline,value[i].step_id,value[i].step_name])
  }


 gsheetAction.appendGSheet("https://docs.google.com/spreadsheets/d/1KaWTjdth9Y6LHgJTXGa3YjkQnmgBOvCB9DjUrYnrrXI/edit?gid=1424795867#gid=1424795867",dataSend)


});

*/
/*


*/
/*
getOneCompanyByID(21527412).then(value => {
  console.log("🚀 ~ getListCustomFields ~ value:", value)
});

/*

getActivitiesByIDCompany(21527412).then(value => {
  console.log("🚀 ~ zctivities:", value)
});


getOpportWithFilterCompany("opportunities",57968213).then(value => {
  console.log(value)
//console.log("🚀 ~ file: sellsyApi2.js:109 ~ getOneCompanyByEmail ~ recup:", value)
  
  
  })


/*  ------------- 

getOneCompanyByID(22019313).then(value => {
console.log("🚀 ~ getOneEstimateByID ~ value:", value)

})

/*
getOneContactByID({
        dateDebut: "2026-02-01",
        dateFin: "2026-02-03",
      }).then(value => {
console.log("🚀 ~ getOneEstimateByID ~ value:", value.data[0])
console.log("🚀 ~ getOneEstimateByID ~ value 1:", value.data[0])
console.log("🚀 ~ getOneEstimateByID ~ value embed:", value.data[0]._embed)
console.log("🚀 ~ getOneEstimateByID ~ value embed[1]:", value.data[0]._embed.custom_fields[1].parameters)
}) 

/* ----- */
let invoiceUpdateCustomFields=async(idInvoice,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""


  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/estimates/${idInvoice}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: [
        {
          "id" :220891,
          "value": "titre du site"
        },        {
          "id" :195291,
          "value": "descGoogle"
        },        {
          "id" :220889,
          "value": "meta du site"
        },
      ]
      
    });

    console.log(response.data);
  } catch (error) {
    console.error("Sellsy      ------->","------->",error.response.data.error);
  }

}

let opportunityUpdateCustomFields=async(idOpport,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""


  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/opportunities/${idOpport}/custom-fields`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data:valueChamp
      
    });

    console.log("Sellsy   opport custom     ------->",response.statusText);
  } catch (error) {
    console.error("Sellsy     opport custom   ------->",error.response.data.error);
  }

}

let opportunityUpdate=async(idOpport,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""


  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/opportunities/${idOpport}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data:valueChamp
      
    });

    console.log("Sellsy   opport      ------->",response.statusText);
  } catch (error) {
    console.error("Sellsy     opport    ------->",error.response.data.error);
  }

}




let opportunityUpdateToLost = async(idOpport) => {
  let token = await getToken()
  
  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/opportunities/${idOpport}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: {
       // "statuses": ["lost"], // ✅ Changé de "Lost" à "lost" (minuscules)
       "status":"lost"
      }
    });

    console.log("Sellsy opport ------->", response);
  } catch (error) {
    console.error("Sellsy opport ------->", error.response?.data?.error || error.message);
  }
}


//opportunityUpdateToLost(2780853)

let estimatesEditCustomField =async(idOpport,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""


  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/estimates/${idOpport}/custom-fields`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data:valueChamp
      
    });

    console.log("Sellsy   devis custom     ------->",response.statusText);
  } catch (error) {
    console.error("Sellsy     devis custom   ------->",error.response.data.error);
  }

}




let companyUpdateCustomFields=async(idCompany,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""

  console.log("Société renichie ",idCompany,valueChamp)

  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/companies/${idCompany}/custom-fields`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data:valueChamp
      
    });

    console.log("Sellsy company custom Update OK ------->",response.statusText);
  } catch (error) {
    console.error("Sellsy company Update Error ------->",error.response.data.error);
  }

}

let invoicesUpdateCustomFields=async(idInvoices,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""

  console.log("from Send ",idInvoices,valueChamp)

  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/invoices/${idInvoices}/custom-fields`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data:valueChamp
      
    });

    console.log("Sellsy   company custom  L111 from update ------->",response.statusText);
  } catch (error) {
    console.error("Sellsy    company custom   L113 ------->",error.response.data.error);
  }

}



let companyUpdateNotes=async(idCompany,valueChamp)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""


  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/companies/${idCompany}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },data:{
      "note":valueChamp ,
      }
      
      
    });

    console.log(response.data);
  } catch (error) {
    console.error("Sellsy  Company      ------->",error.response.data.error);
  }

}

/* -----------------   Ajout traité Google ------------------------ */

let companyTraiteGoogle=async(idCompany)=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""

  let sendInfo=[{
    "id" :223757,
    "value":"Oui" 
  }]

  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/companies/${idCompany}/custom-fields`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: sendInfo
      
    });

    console.log("Sellsy   company custom L170 Traite Google ------->",response.statusText);
  } catch (error) {
    console.error("Sellsy    company custom L172 Traite Google  ------->",error.response.data.error);
  }

}



/*          -  */



let valueSend=[
  {
    "id" :220891,
    "value": "titre du site"
  },        {
    "id" :195291,
    "value": "descGoogle2"
  },        {
    "id" :220889,
    "value": "meta du site"
  },
]

let updateTeam=async()=>{
  let token=await getToken()
  //let email="zweideckautomobiles@gmail.com"
  let info=""

  let idContact="148313"
  try {
    const response = await axios({
      method: 'PUT',
      url: `https://api.sellsy.com/v2/staffs/${idContact}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
      },
      data: [{
        "groups":{ "id": 8872, "name": 'Ancien Collaborateurs' },
        }
      ]
      
    });

    console.log(response.data);
  } catch (error) {
    console.error("Sellsy      ------->","------->",error.response.data.error);
  }

}



/*
updateTeam().then(value => {
  
    let recup=JSON.stringify(value)
    console.log("🚀 ~ file: sellsyApi2.js:109 ~ getOneCompanyByEmail ~ recup:", value)
    
    })
/* --- --  */

export {
	companyUpdateCustomFields,
  companyUpdateNotes,
  opportunityUpdateCustomFields,
  companyTraiteGoogle,
  opportunityUpdate,
  estimatesEditCustomField,
  invoicesUpdateCustomFields,
  opportunityUpdateToLost,

  getCompanyFromName,
  getCompanyListWithOpportWithFilter,
  getContactList,
  getContactListWithFilter,
  getEstimatesFromClient,
  getestimatesWithFilter,
  getInvoiceByData,
  getInvoicesWithFilter,
  getListEstimateByCompanyID,
  getListOpportByCompanyID,
  getCompanyFromFilter,
  getOneCompanyByEmail,
  getOneCompanyByID,
getActivitiesByIDCompany,
  getOneContactByID,
  getOneEstimateByID,
  getOneInvoiceByID,
  getOneOpportByID,
  getOneOpportCustomFieldsByID,
  getOpportFromClient,
  getOpportInStepWithFilter,
  getOpportWithFilter,
  getStaffByID,
  getOpportWithFilterCompany,
  getLabelFromCustomField,
  getSelectedItemFromCustomField,
  getFlatPipelinesAndSteps,
  getListOpportByDate,
  getListEstimatesByDate,
  getListEstimatesByOffset,
  getListCompanies,
  getStaffAll,
  getDevisAll,
  getOpportLastUpdated30,
  getClientAll,
  getCompaniesAll,
  getInvoicesAll,
  getListInvoicesForACompany
};





function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });

  res.end(JSON.stringify(payload));
}

function parseQuery(reqUrl) {
  const qs = reqUrl.split('?')[1] || '';
  const out = {};

  new URLSearchParams(qs).forEach((v, k) => {
    out[k] = v;
  });

  return out;
}

export async function handleSellsyRoute(req, res) {
  const urlPath = req.url.split('?')[0];
  const params = parseQuery(req.url);

  try {
    if (urlPath === '/api/sellsy/company-by-id') {
      const data = await getOneCompanyByID(params.id);
      return sendJson(res, 200, data);
    }

    if (urlPath === '/api/sellsy/company-by-email') {
      const data = await getOneCompanyByEmail(params.email);
      return sendJson(res, 200, data);
    }

    if (urlPath === '/api/sellsy/opportunity-by-id') {
      const data = await getOneOpportByID(params.id);
      return sendJson(res, 200, data);
    }

    if (urlPath === '/api/sellsy/estimate-by-id') {
      const data = await getOneEstimateByID(params.id);
      return sendJson(res, 200, data);
    }

    if (urlPath === '/api/sellsy/invoice-by-id') {
      const data = await getOneInvoiceByID(params.id);
      return sendJson(res, 200, data);
    }

    return sendJson(res, 404, {
      error: 'Route Sellsy inconnue',
      route: urlPath,
    });

  } catch (err) {
    return sendJson(res, 500, {
      error: err.message,
    });
  }
}