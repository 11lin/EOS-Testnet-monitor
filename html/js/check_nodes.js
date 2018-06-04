/*###############################################################################
#
# EOS TestNet Monitor
#
# Created by http://CryptoLions.io
#
# Git Hub: https://github.com/CryptoLions/EOS-Testnet-monitor
#
###############################################################################  */


var LastBlockNum = -1;
var LastNodeChecked = -1;
var LastProducer = "";
var activated_interval;
var errorNodes = [];
var skipBETurn = 0;
var socket;
var nodesResponseTime = [];

var blockProducerList = [];

var _showNodeInfo = 1;
var _showNodeInfoSys = 1;
var BPLocations=[];
var map;
var bpMapConnectionPath=[];

var badNodes = {};
var unsycedNodes = {};
var wrongChainNodes = {};
var badNodesSorting = 1;

var PRODUCERS_LIST = {};
var PRODUCER_VOTES = {};


$( document ).ready(function() {
	init();
});


function init(){
	if (getCookie('votes'))
		PRODUCER_VOTES = JSON.parse(getCookie('votes'));
    socket = io(eosMonitorServer);
    socket.on('blockprod_update', function(msg){
      updateBEprod(msg);
    });


    socket.on('blockupdate', function(msg){
      $('#totProcessedBlocks').html(msg.block_num);
      $('#maxTPS').html("<a href='#' onclick='showBlock("+msg.max_tps_block+");'>" + msg.max_tps + "</a>");

    });

    socket.on('get_info', function(msg){
      updateNodeInfo(msg, msg.nodeid);
    });

    socket.on('error_node', function(msg){
      nodeError("", msg);
    });

    socket.on('ping', function(msg){
      if (msg && msg.nodeid >= 0 ) {
      	if (blockProducerList.length == 0) return;
      	$("#resp_time_n0_"+blockProducerList[msg.nodeid].bp_name ).addClass( "black" );
      	$("#resp_time_n0s_"+blockProducerList[msg.nodeid].bp_name ).addClass( "black" );
      	//$("#c1_"+blockProducerList[msg.nodeid].bp_name ).addClass( "bold" );
      }
    });

    socket.on('initNodes', function(msg){
      blockProducerList = msg;
      initNodesList();
    });

    socket.on('initProducersStats', function(msg){
		for (var k in msg)
			updateBEprod(msg[k]);
    });

    socket.on('reload', function(msg){
		location.reload();
    });

    socket.on('transaction', function(msg){
		transactionController(msg);
    });
    socket.on('usersonline', function(msg){
    	$('#connectedUsers').html(msg);
    });

    socket.on('listproducers', function(msg){
    	showListProducers(msg);
    });


    socket.on('api', function(msg){
    	$('#modal_body').html('<pre id="json">'+JSON.stringify(msg, null, 2) + '</pre>');
    });

    socket.on('console', function(msg){
    	console.log(msg);
    });

    initNodesList();

    activated_interval = setInterval (checkNodes, 500);
    showHideNodeInfo(true);
	showHideNodeInfoSys(true);
	$(".showHideAddresInfo").click(showHideNodeInfo);
	$(".showHideAddresInfoSys").click(showHideNodeInfoSys);




	$("#btn_API_req").click(function(){
		var api_req = $('#api_req').val();
		var api_data = $('#api_data').val();
		//console.log({"api": api_req, "data": api_data});

		socket.emit("api", {"api": api_req, "data": api_data});

	});
    $("#accountPopup").click(show_accountPopup);
    $("#faucetPopup").click(show_faucetPopup);
	$("#apiPopup").click(show_apiPopup);
	$("#p2pPopup").click(show_p2pListPopup_Intrevall);
	$("#bpsPopup").click(show_bpListPopup_Intrevall);
    $("#registerPopup").click(show_registerPopup);
    $("#mapPopup").click(show_mapPopup);
    $("#btn_vote").click(show_VotePopup);
    $("#accountInfoPopup").click(show_accountInfoPopup);


    $("#sortNodes").click(sortNodes);

	switch (location.hash) {
		case '#account':
			show_accountPopup();
			break;

		case '#faucet':
			show_faucetPopup();
			break;

		case '#register':
			show_registerPopup();
			break;
		case '#api':
			show_apiPopup();
			break;
		case '#p2p':
			show_p2pListPopup_Intrevall();
			break;
		case '#bp':
			show_bpListPopup_Intrevall();
			break;
		case '#accountInfo':
			show_accountInfoPopup();
			break;


		case '#map':
			setTimeout(show_mapPopup,1000);
			break;

		case 'def':
			break;

	}

	/*
	$('table').on('click', '.move-up', function () {
	    var thisRow = $(this).closest('tr');
	    var prevRow = thisRow.prev();
	    if (prevRow.length) {
	        prevRow.before(thisRow);
	    }
	});
	*/


}

function show_VotePopup(){
	$('#modal_body').html("");
	$('#apiInput').hide();

	$('#modalheaderTitle').show();
	$('#modalheaderTitle').html('<legend class="">Vote</legend>');

	var pbv = "";
	var pbv_ = "";

	for (var va in PRODUCER_VOTES) {
        //console.log(PRODUCERS_LIST);
        //console.log(va);


		if (PRODUCERS_LIST[va] && PRODUCERS_LIST[va].producer_key != "EOS1111111111111111111111111111111114T1Anm") {
			if (PRODUCER_VOTES[va]){
				if (pbv != "") pbv += ", ";
				pbv += va;
				pbv_ += " "+va;
			}
		}
	}

    var acc_vote_name = getCookie("acc_vote_name");
    if (acc_vote_name == "undefined" || acc_vote_name == "") acc_vote_name = "lion";

	var cleoscmd_ = "./cleos.sh system voteproducer prods %S" + pbv_ + " -p %S";

	var cleoscmd = cleoscmd_.replace(/\%S/g, acc_vote_name);

    var html = "this feature created to help voting. It creates cleos command based on checked producers.";
    html += "<BR>";
	html += 'Selected producers: <b>' + pbv + '</b>';

    html += "<BR>";
    html += '                 \
		<div class="input-group">  \
		  <div class="input-group-prepend"> \
		    <span class="input-group-text" id="">Your account name: </span> \
		  </div> \
		  <input type="text" class="form-control" placeholder="lion" aria-label="account name" id="vote_acc_name" aria-describedby="basic-addon2" value="'+acc_vote_name+'">\
		  <!--div class="input-group-append">\
		    <button class="btn btn-outline-success" id="gen_cleos_vote_btn" type="button">Refresh</button>\
		  </div--> \
		</div>\
	'
//    html += '<a href="#" class="btn btn-success" id="gen_cleos_vote_btn">Generate</a>'
    html += "<HR>";

	if (pbv_ == "") cleoscmd = "Check at least one producer (check box)";

  	html += '<span id="cleos_vote" class="terminal" onclick="fnSelect(\'cleos_vote\')">'+cleoscmd+'</span>';

	$('#modal_body').html(html);
	$('#myModal').modal('show');

	$( "#vote_acc_name" ).keyup(function() {
		var accname = $("#vote_acc_name").val();
		setCookie("acc_vote_name", accname, 100);
        var cleoscmd = cleoscmd_.replace(/\%S/g, accname);
        if (accname == "") cleoscmd = "Enter account name."
        $('#cleos_vote').html(cleoscmd);


	});

	$("#gen_cleos_vote_btn").click(function(){
		var accname = $("#vote_acc_name").val();
		setCookie("acc_vote_name", accname, 100);
        var cleoscmd = cleoscmd_.replace(/\%S/g, accname);
        $('#cleos_vote').html(cleoscmd);

	});

}

function show_accountInfoPopup(){
	$('#modal_body').html("");
	$('#apiInput').hide();

	$('#modalheaderTitle').show();
   	var lastAccInfo = getCookie("lastAccInfo");

   	var input_ = ' \
		<div class="input-group">  \
		  <div class="input-group-prepend"> \
		    <legend class="">Account Info &nbsp;&nbsp;&nbsp; </legend> \
		  </div> \
		  <input type="text" class="form-control" placeholder="lion" aria-label="account name" id="accountNameInfo" aria-describedby="basic-addon2" value="'+lastAccInfo+'">\
		  <div class="input-group-append">\
		    <button class="btn btn-outline-info" id="get_account_info_btn" type="button">Get</button>\
		  </div> \
		</div>\
		Get information about account and balance  \
		';
	$('#modalheaderTitle').html(input_);

    var html = "<span id='accInfo_res'></span>";
	$('#modal_body').html(html);

	$( "#accountNameInfo" ).keyup(function() {
		var accname = $("#accountNameInfo").val();
		setCookie("lastAccInfo", accname, 100);
	});


	$("#get_account_info_btn").click(getAccountInfo_btn);


    $('#myModal').on('hidden.bs.modal', goHome);

	if (lastAccInfo)
		getAccountInfo_btn();

	$('#myModal').modal('show');
}

function getAccountInfo_btn(){
   	$("#get_account_info_btn").prop("disabled",true);

    	$('#accInfo_res').html("Processing...");
        var output = "";
        var accname = $('#accountNameInfo').val();
        if (accname != accname.replace(/[^a-z0-9]/g,'') || accname == ""){
        	//bad account
            $('#accInfo_res').html("<span class='red'> Wrong account name </span><BR><BR>");
            $("#get_account_info_btn").prop("disabled",false);
        } else {
        	//ok
        	setCookie("lastAccInfo", accname, 100);
        	socket.emit("accountInfo", accname);
        	socket.on("accountInfo_res", function(data){
                if (data.balance) output += "<span class='green'><b>Balance:</b> <BR>" + data.balance.replace(/\n/g, "<BR>") + "</span><BR>";

                if (data.stdout) {
                	var info_html = "";
                	var last_code_update = "--";
                	if (data.stdout.last_code_update != "1970-01-01T00:00:00.000")
                	 	last_code_update =  convertUTCDateToLocalDate(new Date(data.stdout.last_code_update));

					if (data.stdout.total_resources == null)
						data.stdout.total_resources = {ram_bytes: -1, net_weight: -1, cpu_weight: -1}

					if (data.stdout.delegated_bandwidth == null)
						data.stdout.delegated_bandwidth = {net_weight: -1, cpu_weight: -1}


                	info_html += "Created: " + convertUTCDateToLocalDate(new Date(data.stdout.created)) + "<BR>";
                	info_html += "Last code Update: " + last_code_update + "<BR>";
                    info_html += "<BR>";
                	info_html += "Active Key: " + data.stdout.permissions[0].required_auth.keys[0].key + "<BR>";
					info_html += "Owner Key: " + data.stdout.permissions[0].required_auth.keys[0].key + "<BR>";


                    info_html += "<BR>";
					info_html += "RAM used " + data.stdout.ram_usage + " bytes / quota: " +  data.stdout.total_resources.ram_bytes + " bytes <BR>";
                    info_html += "<BR>";

                	if (data.stdout.delegated_bandwidth == null){
                		data.stdout.delegated_bandwidth = {};
                		data.stdout.delegated_bandwidth.net_weight ="--";
                		data.stdout.delegated_bandwidth.cpu_weight = "--";
                	}

					info_html += "NET bandwidth:<BR>"
					info_html += " staked: " + data.stdout.delegated_bandwidth.net_weight + "<BR>";
					info_html += " delegated: " + data.stdout.total_resources.net_weight + " <BR>";
					info_html += " current: " + data.stdout.net_limit.used + " / available: " + data.stdout.net_limit.available + " bytes<BR>";
					info_html += " max: " + data.stdout.net_limit.max + " bytes<BR>";



					//info_html += " weight: " +  data.stdout.net_weight + "<BR>";

                    info_html += "<BR>";
					info_html += "CPU bandwidth:<BR>"
					info_html += " staked: " + data.stdout.delegated_bandwidth.cpu_weight + "<BR>";
					info_html += " delegated: " + data.stdout.total_resources.cpu_weight + "<BR>";
					info_html += " current: " + data.stdout.cpu_limit.used + " / available: " + data.stdout.cpu_limit.available + " time <BR>";
					info_html += " max: " + data.stdout.cpu_limit.max + " time<BR>";



					if (data.stdout.voter_info == null ){
						data.stdout.voter_info = {};
						data.stdout.voter_info.last_vote_weight = "--";
						data.stdout.voter_info.proxy = [];
						data.stdout.voter_info.producers = [];
						data.stdout.voter_info.staked = "--";
						data.stdout.voter_info.proxied_vote_weight = "--";
						data.stdout.voter_info.is_proxy = "--";
						data.stdout.voter_info.deferred_trx_id = "--";
						data.stdout.voter_info.last_unstake_time = "1970-01-01T00:00:00"
					}

                    info_html += "<BR>";
					info_html += "Voter Info:<BR>"
					info_html += " Proxy: ";
					for (var i in data.stdout.voter_info.proxy)
						info_html += " " + data.stdout.voter_info.proxy[i];
					info_html += "<BR>";
					info_html += " Producers: "
					for (var i in data.stdout.voter_info.producers)
						info_html += " " + data.stdout.voter_info.producers[i];
                    info_html += "<BR>";
					info_html += " staked: " + data.stdout.voter_info.staked + "<BR>";
					info_html += " last vote weight: " + data.stdout.voter_info.last_vote_weight + "<BR>";
					info_html += " proxie vote weight: " + data.stdout.voter_info.proxied_vote_weight + "<BR>";
					info_html += " is proxy: " + data.stdout.voter_info.is_proxy + "<BR>";
					info_html += " deferred trx id: " + data.stdout.voter_info.deferred_trx_id + "<BR>";

                	var last_unstake_time = "--";
                	if (data.stdout.voter_info.last_unstake_time != "1970-01-01T00:00:00")
                	 	last_unstake_time =  convertUTCDateToLocalDate(new Date(data.stdout.voter_info.last_unstake_time));

					info_html += " last unstake time: " + last_unstake_time + "<BR>";
					info_html += " unstaking: " + data.stdout.unstaking + "<BR>";


					//info_html += "CPU weight: " +  data.stdout.cpu_weight + "<BR>";


                	output += "<span class='green'><b>Account Info:</b> <BR>" + info_html + "</span>";

                }


                if (data.stderr) output += "<span class='red'>" + data.stderr + "</span><BR><BR>";



            	$('#accInfo_res').html(output);
            	$("#get_account_info_btn").prop("disabled",false);

        	});
        }

    	//if (accData){

}


function show_registerPopup(){
	$('#modal_body').html("");
	$('#apiInput').hide();
	$('#modalheaderTitle').show();
	$('#modalheaderTitle').html('<legend class="">Register your EOS Node 1/2</legend>');
	$('#modal_body').html($('#RegisterForm').html());
	$('#myModal').modal('show');
	$('#myModal').on('hidden.bs.modal', goHome);

    $("#reg_btn_register").click(function(){

    	var inputs = $("#reg_form :input");
    	var regData = validateRegister(inputs);
    	if (regData){
			$("#tab-reg1").removeClass("active");
			$("#tab-reg2").addClass("active");

           	$('#modalheaderTitle').html('<legend class="">Register your EOS Node 2/2</legend>');

            $("#tab-reg2").html("Registering account...<BR>");

    		socket.emit("register", regData);

    		var output = "";
        	socket.on("register_res", function(data){

            	if (data.stdout) output += "<span class='green'>" + data.stdout + "</span><BR>";
            	if (data.stderr) {

            		output += "<span class='red'>" + data.stderr + "</span><BR><BR>";
            		output += "<a href='#' onclick='\$(\"#tab-reg2\").removeClass(\"active\");\$(\"#tab-reg1\").addClass(\"active\");'>Back</a>"
            	}

        		$("#tab-reg2").html(output);

        	});

        	//console.log('OKOKOKOK');
    	}
    	//console.log(inputs);
    });
}

function show_accountPopup(){
	$('#modal_body').html("");
	$('#apiInput').hide();
	$('#modalheaderTitle').show();
	$('#modalheaderTitle').html('<legend class="">Create account</legend>');
	$('#modal_body').html($('#CreateAccountForm').html());
	$('#myModal').modal('show');
	$('#myModal').on('hidden.bs.modal', goHome);

    $("#reg_btn_create").click(function(){
    	//console.log($("#reg_form"));
    	$("#reg_btn_create").prop("disabled",true);
    	$('#reg_acc_res').html("Processing...");
    	var output = "";
    	var inputs = $("#reg_account :input");
    	var accData = validateCreateAccount(inputs);
    	if (accData){
        	//console.log(accData);
        	socket.emit("createAccount", accData);

        	socket.on("createAccount_res", function(data){

        		$("#reg_btn_create").prop("disabled", false);


                if (data.stderr) output += "<span class='red'>" + data.stderr + "</span><BR><BR>";
                if (data.stdout) output += "<span class='green'>" + data.stdout + "</span>";


            	$('#reg_acc_res').html("<hr>"+output);

        	});
        	//$('#myModal').modal('hide');
        	//console.log('OKOKOKOK');
    	}
    	//console.log(inputs);
    });
}

function show_faucetPopup(){
	$('#modal_body').html("");
	$('#apiInput').hide();
	$('#modalheaderTitle').show();
	$('#modalheaderTitle').html('<legend class="">Jungle Faucet</legend>');
	$('#modal_body').html($('#FaucetForm').html());
	$('#myModal').modal('show');
	$('#myModal').on('hidden.bs.modal', goHome);

    $("#faucet_btn").click(function(){


    	$("#faucet_btn").prop("disabled",true);

    	$('#reg_faucet_res').html("Processing...");

    	//setTimeout(function(){ $("#faucet_btn").prop("disabled",false);}, 4000);
        var output = "";
    	var inputs = $("#faucet_form :input");
    	var accData = validateFaucet(inputs);
    	if (accData){
        	//console.log(accData);
        	socket.emit("faucet", accData);
        	socket.on("faucet_res", function(data){

           	if (data.stderr) output += "<span class='red'>" + data.stderr + "</span><BR><BR>";
            if (data.stdout) output += "<span class='green'>" + data.stdout + "</span>";

			setTimeout(function(){
					$("#faucet_btn").prop("disabled",false);
					}, 10000);




            	$('#reg_faucet_res').html("<hr>"+output);

        	});
        	//$('#myModal').modal('hide');
        	//console.log('OKOKOKOK');
    	}
    	//console.log(inputs);
    });
}

function validateRegister(inputs){
	var isFormValid = true;
    var accData = {};
    var pass1_i = 0;
    var pass2_i = 0;

    var pass1 = "";
    var pass2 = "";

	for (var i = 0; i < inputs.length; i++){
		if (inputs[i].name){
			var label = $("label[for='"+inputs[i].id+"']");
            var isFieldValid = true;

			//Empty Value
			//if (!inputs[i].value && inputs[i].name != "reg_comments"){
			//	isFieldValid = false;
			//}

            //if (inputs[i].name == "reg_password") pass1_i = i;
            //if (inputs[i].name == "reg_password_confirm") pass2_i = i;

            var iname = inputs[i].value+"";

			switch (inputs[i].name) {
				case "reg_nodename":
						if ( iname != iname.replace(/[^a-z1-6]/g,'') || iname == "")
                				    isFieldValid = false
						if ( iname.length != 12)
						    isFieldValid = false

						accData.bp_name = inputs[i].value
					break;

				case "reg_password":
						if ( iname == "")
                			isFieldValid = false
						pass1 = inputs[i].value;
						pass1_i = i;
					break;

				case "reg_password_confirm":
						if ( iname == "")
                			isFieldValid = false
						pass2 = inputs[i].value;
						pass2_i = i;
					break;


				case "reg_organisation":
                    if ( inputs[i].value == "")
                		isFieldValid = false
                	accData.organisation = inputs[i].value
					break;
				case "reg_location":
					if ( inputs[i].value == "")
                		isFieldValid = false
                	accData.location = inputs[i].value
					break;
				case "reg_http_server_address":
					if ( iname != iname.replace(/[^a-z0-9\.\-\_A-Z\:]/g,'') || iname == "" || !iname.includes(":") || !iname.includes("."))
                		isFieldValid = false
                	accData.http_server_address = inputs[i].value

					break;
				case "reg_p2p_listen_endpoint":
					if ( iname != iname.replace(/[^a-z0-9\.\-\_A-Z\:]/g,'') || iname == "" || !iname.includes(":") || !iname.includes("."))
                		isFieldValid = false
                	accData.p2p_listen_endpoint = inputs[i].value
					break;
				case "reg_https_server_address":
					if ( iname != iname.replace(/[^a-z0-9\.\-\_A-Z\:]/g,'') || (iname.lenght > 0 && ( !iname.includes(":") || !iname.includes(".") ) ) )
                		isFieldValid = false
                	accData.https_server_address = inputs[i].value
					break;

				case "reg_p2p_server_address":
					if ( iname != iname.replace(/[^a-z0-9\.\-\_A-Z\:]/g,'') || iname == "" || !iname.includes(":") || !iname.includes("."))
                		isFieldValid = false
                	accData.p2p_server_address = inputs[i].value
					break;
				case "reg_pub_key":
					if ( iname != iname.replace(/[^a-zA-Z0-9]/g,'') || iname == "")
						isFieldValid = false
                	accData.pub_key = inputs[i].value
					break;
				case "reg_comments":
                	accData.comment = inputs[i].value
					break;
				case "reg_url":
                	accData.url = inputs[i].value
					break;

                 case "reg_telegram":
                	accData.telegram = inputs[i].value
					break;
	 			case "reg_isBP":
	 				accData.bp = false;
                	if(inputs[i].checked) accData.bp = true;
					break;



			}

			if (!isFieldValid) {
				$(label).addClass("red");
				isFormValid = false;
			} else {
				$(label).removeClass("red");
			}

			//	$("$"+inputs[i].id).addClass("red");
			//console.log(inputs[i].name + ' = ' + inputs[i].value);
		}
	}


	if (pass1 != pass2 || pass1 == "" || pass2 == "") {
		$("label[for='"+inputs[pass1_i].id+"']").addClass("red");
		$("label[for='"+inputs[pass2_i].id+"']").addClass("red");
		isFormValid = false;
	} else {
		accData.pin = pass1;
		$("label[for='"+inputs[pass1_i].id+"']").removeClass("red");
		$("label[for='"+inputs[pass2_i].id+"']").removeClass("red");
	}


	if (pass1.length < 4 ) {
		$("label[for='"+inputs[pass1_i].id+"']").addClass("red");
		isFormValid = false;
	} else {
		$("label[for='"+inputs[pass1_i].id+"']").removeClass("red");
	}

 	if (isFormValid)
    	return accData


	return isFormValid;
}

function validateCreateAccount(inputs){
	var isFormValid = true;
    var accData = {}
	for (var i = 0; i < inputs.length; i++){
		if (inputs[i].name){
			var label = $("label[for='"+inputs[i].id+"']");
            var isFieldValid = true;

			//Empty Value
			if (!inputs[i].value){
				isFieldValid = false;
			}

         	if (!isFieldValid) {
				$(label).addClass("red");
				isFormValid = false;
			} else {
				$(label).removeClass("red");
			}

   			if (inputs[i].name == "reg_accname"){
				var iname = inputs[i].value+"";
				if ( iname != iname.replace(/[^a-z1-6]/g,'')){
                	isFormValid = false;
                	$("label[for='"+inputs[i].id+"']").addClass("red");
                } else {
                	$("label[for='"+inputs[i].id+"']").removeClass("red");
                }

				accData.account = inputs[i].value

			}
   			if (inputs[i].name == "reg_pubkey1")
				accData.pub_key1 = inputs[i].value

   			if (inputs[i].name == "reg_pubkey2")
				accData.pub_key2 = inputs[i].value

			//	$("$"+inputs[i].id).addClass("red");
			//console.log(inputs[i].name + ' = ' + inputs[i].value);
		}
	}
    if (isFormValid)
    	return accData

    $("#reg_btn_create").prop("disabled", false);
	return isFormValid;
}


function validateFaucet(inputs){
	var isFormValid = true;
    var accData = {}
	for (var i = 0; i < inputs.length; i++){
		if (inputs[i].name){
			var label = $("label[for='"+inputs[i].id+"']");
            var isFieldValid = true;

			//Empty Value
			if (!inputs[i].value){
				isFieldValid = false;
			}

         	if (!isFieldValid) {
				$(label).addClass("red");
				isFormValid = false;
			} else {
				$(label).removeClass("red");
			}

   			if (inputs[i].name == "reg_accnamef"){
				var iname = inputs[i].value+"";
				if ( iname != iname.replace(/[^a-z0-9]/g,'') || iname == ""){
                	isFormValid = false;
                	$("label[for='"+inputs[i].id+"']").addClass("red");
                } else {
                	$("label[for='"+inputs[i].id+"']").removeClass("red");
                }

				accData.account = inputs[i].value

			}

			//	$("$"+inputs[i].id).addClass("red");
			//console.log(inputs[i].name + ' = ' + inputs[i].value);
		}
	}
    if (isFormValid)
    	return accData

    $("#faucet_btn").prop("disabled",false);
	return isFormValid;
}
function show_mapPopup(){
	$('#modal_body').html("");
	$('#apiInput').hide();
	$('#modalheaderTitle').show();

	$('#modalheaderTitle').html("Jungle Map");
    //MapAPI: AIzaSyA35R7w7GuorQr2udo6t7qOBR_MN3bGetQ


    $('#modal_body').html('<div id="map"></div>');
    initMap();
	$('#myModal').modal('show');
	$('#myModal').on('hidden.bs.modal', goHome);
}

function initMap() {
	//var mapCenter = {lat: 41.809394, lng: 8.871158};
    var mapCenter = new google.maps.LatLng(41.809394, -76.617);
	// Create a map object and specify the DOM element for display.
	map = new google.maps.Map(document.getElementById('map'), {
		center: mapCenter,
		zoom: 1.5
	});

/*
	var markers = BPLocations.map(function(location, i) {

 		return new google.maps.Marker({

        	position: location,
            label: location.label,
            animation: google.maps.Animation.DROP,
            draggable: true,
            anchor: {u:0, v:0},

            icon: 'imgs/m'+Math.floor(Math.random() * (5 - 1) + 1)+'.png',
            map: map
   		});
   	});
 */


	//i=1;


	for (var j=0; j < BPLocations.length; j++){


		var cityCircle = new google.maps.Circle({
            strokeColor: '#45A923',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#58D52F',
            fillOpacity: 0.35,
            map: map,
            center: BPLocations[j],
            radius: 100000
 		});

	}

    //drawBPConnections(0)
    //var con_i = 0;
    //setInterval(function(){
	//	con_i++;
	//	if (con_i >= BPLocations.length-1) con_i = 0;
    //	drawBPConnections(con_i);
    //	}, 2000);

   //var markerCluster = new MarkerClusterer(map, markers,  {imagePath: 'imgs/m'});

}

function drawBPConnections(i){
    if (bpMapConnectionPath.setMap){
    	bpMapConnectionPath.setMap(null);
    }
    if (BPLocations.length == 0) return;
    if (!map) return;

	var bp_paths = [];

	var newCoord = mapLatLng(BPLocations[i])
	if (newCoord) bp_paths.push(newCoord);

	for (var j=0; j < BPLocations.length; j++){
	    if (i != j) {
			var newCoord = mapLatLng(BPLocations[j])
			if (newCoord) bp_paths.push(newCoord);

			var newCoord = mapLatLng(BPLocations[i])
			if (newCoord) bp_paths.push(newCoord);


		}
	}

	bpMapConnectionPath = new google.maps.Polyline({
	    path: bp_paths,
	    strokeColor: "#65D5E9",
	    strokeOpacity: 1.0,
	    strokeWeight: 2

  	});
    bpMapConnectionPath.setMap(map);
}

function mapLatLng(item) {
   	if (item && item.lat)
   		return new google.maps.LatLng(item.lat, item.lng);
   	return 0;
};

function reInitMarkes(){

}

function show_apiPopup(){
	$('#modal_body').html("");
	$('#apiInput').show();
	$('#modalheaderTitle').hide();
	$('#myModal').modal('show');
	$('#myModal').on('hidden.bs.modal', goHome);


}

function show_p2pListPopup_Intrevall(){
	$('#modal_body').html("");

	$('#apiInput').hide();
	$('#modalheaderTitle').show();
	$('#modalheaderTitle').html("P2P List for config.ini");
    $('#myModal').on('hidden.bs.modal', goHome);
    $('#modal_body').html('Preparing... (8sec)');
    $('#myModal').modal('show');
    setTimeout(show_p2pListPopup, 8000);

}

function show_p2pListPopup(){
	//$('#modal_body').html("");

	//$('#apiInput').hide();
	//$('#modalheaderTitle').show();
	//$('#modalheaderTitle').html("P2P List for config.ini");
    //$('#myModal').on('hidden.bs.modal', goHome);

	var peer_list = "";
	for (var bpp in blockProducerList){
		if (blockProducerList[bpp].bp && blockProducerList[bpp].enabled)
			if (! (badNodes[blockProducerList[bpp].bp_name] > 0 || unsycedNodes[blockProducerList[bpp].bp_name] > 0 || wrongChainNodes[blockProducerList[bpp].bp_name] > 0) )
				peer_list += "p2p-peer-address = " + blockProducerList[bpp].p2p_server_address + "<BR>";
	}

	$('#modal_body').html('<span id="peer_list" onclick="fnSelect(\'peer_list\')">'+peer_list+'</span>');

}


function show_bpListPopup_Intrevall(){
	$('#modal_body').html("");

	$('#apiInput').hide();
	$('#modalheaderTitle').show();
	$('#modalheaderTitle').html("BP List");
    $('#myModal').on('hidden.bs.modal', goHome);
    $('#modal_body').html('Preparing... (8sec)');
    $('#myModal').modal('show');

    setTimeout(show_bpListPopup, 8000);

}

function show_bpListPopup(){

	var bps = '{ <BR>  \
    "version": "12345",<BR>  \
    "producers": [<BR>   \
	';
    var bp_list = "";
	for (var bpp in blockProducerList){
		if (blockProducerList[bpp].bp && blockProducerList[bpp].enabled)
			if (! (badNodes[blockProducerList[bpp].bp_name] > 0 || unsycedNodes[blockProducerList[bpp].bp_name] > 0 || wrongChainNodes[blockProducerList[bpp].bp_name] > 0))  {
				if (bp_list.length > 0) bp_list += ', '
				bp_list += '<BR/>&nbsp;&nbsp;&nbsp;&nbsp;{"producer_name":"'+blockProducerList[bpp].bp_name+'", "block_signing_key":"'+blockProducerList[bpp].pub_key+'"}';
			}
	}

	bps += bp_list + '<BR>]}';
	$('#modal_body').html('<span id="bp_list" onclick="fnSelect(\'bp_list\')">'+bps+'</span>');

}


function goHome(){
	location.hash = '#home';
}

function showBlock(block){
	var api_req = "/v1/chain/get_block";
	$('#api_req').val(api_req);

	var api_data = '{"block_num_or_id": '+block+'}';
	$('#api_data').val(api_data);
	socket.emit("api", {"api": api_req, "data": api_data});

	$('#modal_body').html("");
	$('#apiInput').show();
	$('#modalheaderTitle').hide();
	$('#myModal').modal('show');

}

function showHideNodeInfo(displayOnly){

	if (!displayOnly) _showNodeInfo = !_showNodeInfo;

	if (_showNodeInfo) {
		$(".c6").hide();
		$(".c7").hide();
		$(".c8").hide();
		$(".c9").hide();

		$(".c12").show();
		$(".c13").show();
		$("#showHideAddresInfo").show();

        _showNodeInfo = false;
	} else {
		$(".c6").show();
		$(".c7").show();
		$(".c8").show();
		$(".c9").show();
		$(".c12").hide();
		$(".c13").hide();

		$("#showHideAddresInfo").hide();
        _showNodeInfo = true;
	}
}

function showHideNodeInfoSys(displayOnly){

	if (!displayOnly) _showNodeInfoSys = !_showNodeInfoSys;

	if (_showNodeInfoSys) {
		$(".cs6").hide();
		$(".cs7").hide();
		$(".cs8").hide();
		$(".cs9").hide();
		$(".cs11").hide();

		$(".cs12").show();
		$(".cs13").show();
		$(".cs14").show();
		$("#showHideAddresInfoSys").show();

        _showNodeInfoSys = false;
	} else {
		$(".cs6").show();
		$(".cs7").show();
		$(".cs8").show();
		$(".cs9").show();
		$(".cs11").show();

		$(".cs12").hide();
		$(".cs13").hide();
		$(".cs14").hide();
		$("#showHideAddresInfoSys").hide();
        _showNodeInfoSys = true;
	}
}


function updateBEprod(data){
   	$('#c12_'+data.name).html(data.produced);
   	$('#c13_'+data.name).html(data.tx_count);
}



function checkNodes(){
	updNodeCheckTime();
}


function updateNodeInfo(node, nodeID){
    if (blockProducerList.length == 0) return;

   	//$( "#c1_"+blockProducerList[nodeID].bp_name ).removeClass( "bold" );
	$("#resp_time_n0_"+blockProducerList[nodeID].bp_name ).removeClass( "black" );
	$("#resp_time_n0s_"+blockProducerList[nodeID].bp_name ).removeClass( "black" );

	if (node.ping) {
		$( "#resp_time_n0_"+blockProducerList[nodeID].bp_name ).html("["+node.ping+"ms]");
		$( "#resp_time_n0s_"+blockProducerList[nodeID].bp_name ).html("["+node.ping+"ms]");
	}

	if (node.txs)
    	$('#txCount').html(node.txs);

	if (node.txblocks)
    	$('#nonEmptyBlockCount').html(node.txblocks);


	$( "#noderow_"+blockProducerList[nodeID].bp_name ).removeClass( "red" );
	$( "#noderows_"+blockProducerList[nodeID].bp_name ).removeClass( "red" );

    blockProducerList[nodeID].lastCheck =  Number(new Date());

	if (errorNodes[blockProducerList[nodeID].bp_name]) {
		$( "#noderow_"+errorNodes[blockProducerList[nodeID].bp_name] ).removeClass( "redtblrow" );
		$( "#noderows_"+errorNodes[blockProducerList[nodeID].bp_name] ).removeClass( "redtblrow" );
		//if (badNodes[blockProducerList[nodeID].bp_name] == 1)
			badNodes[blockProducerList[nodeID].bp_name] = 0;
		delete errorNodes[blockProducerList[nodeID].bp_name];
	}

   	if (LastBlockNum ==-1 || LastBlockNum < node.head_block_num){  //skip not synced nodes


		var bp_ver = parseInt("0x"+node.server_version);
		var bp_chainid = node.chain_id;
		var isOK = true;
		if (checkNodeosVersion && nodeosVersion != bp_ver+""){
			isOK = false
		}

	    if (bp_chainid == undefined)
	    	bp_chainid = chainID;

		if (checkChainID && chainID != bp_chainid+""){
			isOK = false
		}


        if (isOK){
		    $( "#noderow_"+blockProducerList[nodeID].bp_name ).removeClass( "unsynced_tblblrow" );
		    $( "#noderows_"+blockProducerList[nodeID].bp_name ).removeClass( "unsynced_tblblrow" );
				//if (badNodes[blockProducerList[nodeID].bp_name] == 3)
	        		unsycedNodes[blockProducerList[nodeID].bp_name] = 0;
	        		wrongChainNodes[blockProducerList[nodeID].bp_name] = 0;


		   	LastBlockNum = node.head_block_num;
			$('#lastBlock').html(formatBogNumbers(node.head_block_num));
			$('#lastProducer').html(node.head_block_producer);
			$('#lastDate').html(convertUTCDateToLocalDate(new Date(node.head_block_time)));
			$('#lastIrrevBlock').html(node.last_irreversible_block_num);

			if (LastProducer != node.head_block_producer) {
				if (LastProducer) {
					$( "#noderow_"+LastProducer ).removeClass( "greentblrow" );
					$( "#noderows_"+LastProducer ).removeClass( "greentblrow" );
				}
				$( "#noderow_"+node.head_block_producer ).addClass( "greentblrow" );
				$( "#noderows_"+node.head_block_producer ).addClass( "greentblrow" );
				LastProducer = node.head_block_producer;
			}

			var producerID = getProducerID(node.head_block_producer);
			if (producerID >= 0)
				blockProducerList[producerID].producedTime =  Number(new Date());


			blockProducerList[nodeID].lastCheck =  Number(new Date());
			$( "#c4_"+node.head_block_producer ).html(node.head_block_num);
		}
	} else {
		//mark unsynced nodes
		//console.log(LastBlockNum - node.head_block_num);
		if (LastBlockNum - node.head_block_num > markUnsyncBlocks) {
			$( "#noderow_"+blockProducerList[nodeID].bp_name ).addClass( "unsynced_tblblrow" );
			$( "#noderows_"+blockProducerList[nodeID].bp_name ).addClass( "unsynced_tblblrow" );
			unsycedNodes[blockProducerList[nodeID].bp_name] = 3;
		}

	}

	//if (blockProducerList[nodeID].

	$( "#c3_"+blockProducerList[nodeID].bp_name ).html(node.head_block_num);



    var bp_ver = parseInt("0x"+node.server_version);
    var bp_ver_html = '<span data-toggle="tooltip" data-placement="top" data-original-title="'+node.server_version+'">'+bp_ver+'</span>'

	$( "#c6_"+blockProducerList[nodeID].bp_name ).html(bp_ver_html);


    //console.log(blockProducerList[nodeID].bp_name+" : " + chainID + " ?=?" + bp_chainid);
	if (checkChainID && chainID != bp_chainid+"" && bp_chainid != undefined){
	//if (checkChainID && chainID != bp_chainid+"" ){
		$( "#noderow_"+blockProducerList[nodeID].bp_name ).addClass( "incorrec_chainid_tblblrow" );
		$( "#noderows_"+blockProducerList[nodeID].bp_name ).addClass( "incorrec_chainid_tblblrow" );
		wrongChainNodes[blockProducerList[nodeID].bp_name] = 4;
	} else {
		$( "#noderow_"+blockProducerList[nodeID].bp_name ).removeClass( "incorrec_version_tblblrow" );
		$( "#noderows_"+blockProducerList[nodeID].bp_name ).removeClass( "incorrec_version_tblblrow" );
			//if (badNodes[blockProducerList[nodeID].bp_name] != 2)
			wrongChainNodes[blockProducerList[nodeID].bp_name] = 0;
	}


	if (checkNodeosVersion && nodeosVersion != bp_ver+""){
		$( "#noderow_"+blockProducerList[nodeID].bp_name ).addClass( "incorrec_version_tblblrow" );
		$( "#noderows_"+blockProducerList[nodeID].bp_name ).addClass( "incorrec_version_tblblrow" );
		badNodes[blockProducerList[nodeID].bp_name] = 2;
	} else {
		$( "#noderow_"+blockProducerList[nodeID].bp_name ).removeClass( "incorrec_version_tblblrow" );
		$( "#noderows_"+blockProducerList[nodeID].bp_name ).removeClass( "incorrec_version_tblblrow" );
			//if (badNodes[blockProducerList[nodeID].bp_name] != 2)
			badNodes[blockProducerList[nodeID].bp_name] = 0;
	}


    for (var i = 0; i<blockProducerList.length; i++){
    	if (blockProducerList[i].bp_name == LastProducer){
    		drawBPConnections(i);
    		break;
    	}
    }



}

function nodeError(reqest, nodeID){
   	if (blockProducerList.length == 0) return;

   	$( "#resp_time_n0_"+blockProducerList[nodeID].bp_name ).html("[--ms]");
   	$( "#resp_time_n0s_"+blockProducerList[nodeID].bp_name ).html("[--ms]");

   	//$( "#c1_"+blockProducerList[nodeID].bp_name ).removeClass( "bold" );
   	$("#resp_time_n0_" + blockProducerList[nodeID].bp_name ).removeClass( "black" );
   	$("#resp_time_n0s_" + blockProducerList[nodeID].bp_name ).removeClass( "black" );

	$( "#noderow_"+blockProducerList[nodeID].bp_name ).removeClass( "unsynced_tblblrow" );
	$( "#noderow_"+blockProducerList[nodeID].bp_name ).removeClass( "incorrec_version_tblblrow" );
	$( "#noderow_"+blockProducerList[nodeID].bp_name ).addClass( "redtblrow" );

	$( "#noderows_"+blockProducerList[nodeID].bp_name ).removeClass( "unsynced_tblblrow" );
	$( "#noderows_"+blockProducerList[nodeID].bp_name ).removeClass( "incorrec_version_tblblrow" );
	$( "#noderows_"+blockProducerList[nodeID].bp_name ).addClass( "redtblrow" );

	errorNodes[blockProducerList[nodeID].bp_name] = blockProducerList[nodeID].bp_name;
	badNodes[blockProducerList[nodeID].bp_name] = 1;
}

function getProducerID(bpn){
	for (var bp in blockProducerList){
		if (blockProducerList[bp].bp_name == bpn) {
			return bp;
		}
	}
	return -1;
}


function updNodeCheckTime(){
	var now = Number(new Date());

	for (var bp in blockProducerList){
        var lastCheck = now;
        var lastProduced = 0;
        if (blockProducerList[bp].lastCheck)
        	lastCheck = blockProducerList[bp].lastCheck;

		if (blockProducerList[bp].producedTime)
			lastProduced = blockProducerList[bp].producedTime;

		var spentTime = GetHummanTime(Math.floor(now - lastCheck)/1000);

		$('#c2_'+blockProducerList[bp].bp_name).html(spentTime);

		if (lastProduced) {
			var produceTime = GetHummanTime(Math.floor(now - lastProduced)/1000);
			$('#c5_'+blockProducerList[bp].bp_name).html(produceTime);
		}
	}
}


function transactionController(msg){
    if (!this.tblStripe) {
	    this.tblStripe = 1;
	} else {
    	this.tblStripe = 0;
    }

 	var newRow = $(' \
		<tr class="strip_'+this.tblStripe+'"> \
			<td><a href="#" onclick="showBlock('+msg.c1+')">'+msg.c1+'</a></td> \
			<td>'+msg.c2+'</td> \
			<td>'+msg.c3+'</td> \
			<td>'+msg.c4+'</td> \
			<td>'+msg.c5+'</td> \
			<td>'+msg.c6+'</td> \
		</tr> \
		');


 	$('#txTable').prepend(newRow.wrapInner('<div style="display: none;" />'));
    $('#txTable tr:first').children('div').slideDown(200);


    if ($('#txTable').height() > 200 ){

  		while ($('#txTable').height() > 230 ){
			$('#txTable tr:last').remove();
		}
        var lstRow = $('#txTable tr:last');
    	lstRow.children('div').fadeOut(50, function(){lstRow.remove();});
    }

	/*
    if ($('#txTable tr').length > 6) {
		while ($('#txTable tr').length > 7 ){
			$('#txTable tr:last').remove();
		}
        var lstRow = $('#txTable tr:last');
    	lstRow.children('div').fadeOut(50, function(){lstRow.remove();});
    }
    */

}

function votecb_click(bpN){

	var count = 0;
	//on cb check - check if not more than 21 checked
	if (! PRODUCER_VOTES[bpN]) {
		for (var i in PRODUCER_VOTES){
			if (PRODUCER_VOTES[i] && PRODUCERS_LIST[i]) count++;
		}
		if (count > 21) {
			alert ('You selected more than 21 producer');
			return false;
		}
	}


	if ( !PRODUCER_VOTES[bpN] ) PRODUCER_VOTES[bpN] = false;
	PRODUCER_VOTES[bpN] = !PRODUCER_VOTES[bpN];

	setCookie('votes', JSON.stringify(PRODUCER_VOTES), 100);

	return true;
	//$('#votecbs_'+bpN).prop('checked', true);
	//if (PRODUCER_VOTES[bpN]) {

	//} else {

	//}
}


function showListProducers(data_){
  	$('#table-bodySystem').empty();
    var fullTable ="";

	data=data_.rows

    var NodeNum = 0;
    var votes_all = data_.total_producer_vote_weight;
	for (var bp_ in data){
		PRODUCERS_LIST[data[bp_].owner] = data[bp_];
		//data[bp_].owner
		//blockProducerList[bp_].bp_name;
    	var bpN = data[bp_].owner;
    	//
        NodeNum++;


        var votes_ = data[bp_].total_votes;
        var votes_a = votes_.split(".");

        var vote_price = votePrice;// 7961314590657214808;
        var votes = formatBogNumbers(Math.floor(votes_a[0] / vote_price))+" EOS";

		var prcnt =Math.floor((votes_*10000) / votes_all)/100;
		//console.log(data[bp_].owner + " : " + prcnt + " % ");
        var votes_prcnt = "<span class='resp_time' id='votes_prcn_"+bpN+"'>" + prcnt + "%</span>";

		var rowColor = "";
        if (LastProducer == data[bp_].owner)
        	rowColor += " greentblrow"

		if (unsycedNodes[data[bp_].owner]) rowColor += " unsynced_tblblrow"
		if (wrongChainNodes[data[bp_].owner] == 4) rowColor += " incorrec_chainid_tblblrow"
		switch (badNodes[data[bp_].owner]){
			case 2: rowColor += " incorrec_version_tblblrow"
			case 1: rowColor += " redtblrow"
		}

		//var answerTime = $('#c2_'+bpN).html();
		//if (!answerTime) answerTime = "--";

		var response_time = $('#resp_time_n0_'+bpN).html();
		if (!response_time) response_time = "--";
       	response_time = "<span class='resp_time' id='resp_time_n0s_"+bpN+"'>" + response_time + "</span>";

		var cs_arr = [];
		for (i=2; i <= 14; i++){
			cs_arr[i] = $('#c'+i+'_'+bpN).html();
			if (!cs_arr[i]) cs_arr[i] = "--";
		}

		if (cs_arr[10] == "--") cs_arr[10] = data[bp_].url;

		var isChecked = "";
		if (PRODUCER_VOTES[bpN]) isChecked = " checked";
		var voteCheckBox = '<input onclick="return votecb_click(\''+bpN+'\');" id="votecbs_' + bpN + '" type="checkbox"'+isChecked+'>';

		var tabl_prod = "<tr id='noderows_"+bpN+"' class='tblrow text-center"+rowColor+"'> \
			<td class='cs0 text-left' id='cs0_"+bpN+"'>" + voteCheckBox + " " + NodeNum+""+response_time+" </td> \
			<td class='cs1' id='cs1_"+bpN+"'>"+data[bp_].owner +"</td> \
			<td class='cs2' id='cs2_"+bpN+"'>" + cs_arr[2] + "</td> \
			<td class='cs3' id='cs3_"+bpN+"'>" + cs_arr[3] + "</td> \
			<td class='cs5' id='cs5_"+bpN+"'>" + cs_arr[5] + "</td> \
			<td class='cs4' id='cs4_"+bpN+"'>" + cs_arr[4] + "</td> \
			<td class='cs7' id='cs7_"+bpN+"'>" + cs_arr[7] + "</td> \
			<td class='cs8' id='sc8_"+bpN+"'>" + cs_arr[8] + "</td> \
			<td class='cs9' id='cs9_"+bpN+"'>" + cs_arr[9] + "</td> \
			<td class='cs6' id='cs6_"+bpN+"'>" + cs_arr[6] + "</td> \
			<td class='cs11' id='cs11_"+bpN+"'>" + cs_arr[11] + "</td> \
			<td class='cs12' id='cs12_"+bpN+"'>" + cs_arr[12] + "</td> \
			<td class='cs13' id='cs13_"+bpN+"'>" + cs_arr[13] + "</td> \
			<td class='cs10' id='cs10_"+bpN+"'>" + cs_arr[10] + "</td> \
			<td class='cs14' id='cs14_"+bpN+"'>" + votes + votes_prcnt+ "</td> \
		</tr>"

        if (data[bp_].producer_key != "EOS1111111111111111111111111111111114T1Anm")
		 	fullTable += tabl_prod;

	}

	$('#bpTableSystem').append(fullTable);
	showHideNodeInfoSys(false);
}


function initNodesList(){
	$('#table-body').empty();
	$('#table-body-node').empty();

    if (blockProducerList.length == 0) return;

    var nodesBPCount = 0;
    var nodesCount = 0;

    var sort_ok ="";
    var sort1_yell ="";
    var sort1_viol ="";
    var sort1_red ="";
    var fullTable = "";

	for (var bp_ in blockProducerList){
        //if (!blockProducerList[bp_].enabled) continue;
        var isDisabled="";
        if (blockProducerList[bp_].enabled == false) isDisabled=" greytblrow";


        var bpN = blockProducerList[bp_].bp_name;
 		var lastCheck = "--";
 		var lastNodeBlock = "";
 		var lastNodeBlockProduced = "--";
 		var lastNodeBlockProducedTime = "--";
        var nodeVersion = "--";


        var h_ = blockProducerList[bp_].http_server_address.split(":");
        var p2p_ = blockProducerList[bp_].p2p_server_address.split(":");

        var node_addr = h_[0];
        var node_api_port = h_[1];
        var protocol = "http://";

        if (blockProducerList[bp_].https_server_address){
        	var hs_ = blockProducerList[bp_].https_server_address.split(":");
        	node_addr = hs_[0];
        	node_api_port = hs_[1];
        	protocol = "https://";
        }

		if (node_addr == "0.0.0.0") node_addr = p2p_[0];


 		var node_http_url = "<a href='" + protocol + node_addr+":"+node_api_port+"/v1/chain/get_info' target='_blank'>"+node_api_port+"</a>";

		/*
		var toolTip_inf = "Address: " +blockProducerList[bp_].node_addr+ "   \
								HTTP: "+blockProducerList[bp_].port_http+"  \
								SSL: "+blockProducerList[bp_].port_ssl+"  \
							 	P2P: "+blockProducerList[bp_].port_p2p;

        */
        var response_time = "<span class='resp_time' id='resp_time_n0_"+bpN+"'> [--ms]</span>";
 		if (blockProducerList[bp_].bp == true) {
 			nodesBPCount++;

/*
 			$('#bpTable').append("<tr id='noderow_"+bpN+"' class='tblrow text-center'> \
 								<td class='c0' id='c0_"+bpN+"'>"+"<span data-toggle='tooltip' data-placement='top' title='"+toolTip_inf+"'>"+(nodesBPCount)+"</span>"+response_time+" </td> \
 								<td class='c1' id='c1_"+bpN+"'>"+blockProducerList[bp_].bp_name +"</td> \
 								<td class='c2' id='c2_"+bpN+"'>"+lastCheck+"</td> \
 								<td class='c3' id='c3_"+bpN+"'>"+lastNodeBlock+"</td> \
								<td class='c5' id='c5_"+bpN+"'>"+lastNodeBlockProducedTime+"</td> \
								<td class='c4' id='c4_"+bpN+"'>"+lastNodeBlockProduced+"</td> \
								<td class='c7' id='c7_"+bpN+"'>"+blockProducerList[bp_].node_addr+"</td> \
 								<td class='c8' id='c8_"+bpN+"'>"+node_http_url+"</td> \
 								<td class='c9' id='c9_"+bpN+"'>"+blockProducerList[bp_].port_p2p+"</td> \
 								<td class='c6' id='c6_"+bpN+"'>"+nodeVersion+"</td> \
 								<td class='c12' id='c12_"+bpN+"'>--</td> \
 								<td class='c13' id='c13_"+bpN+"'>--</td> \
 								<td class='c10' id='c10_"+bpN+"'>"+blockProducerList[bp_].organisation+"</td> \
 								<td class='c11' id='c11_"+bpN+"'>"+blockProducerList[bp_].location+"</td> \
 							</tr>");
				<td class='c0 text-left' id='c0_"+bpN+"'>"+"<span data-toggle='tooltip' data-placement='top' title='"+toolTip_inf+"'>"+voteCheckBox+" "+(nodesBPCount)+"</span>"+response_time+" </td> \
*/
                        //var voteCheckBox = '<input onclick="votecb_click(\''+bpN+'\'); return false;" id="votecb_' + bpN + '" type="checkbox" value="">';
                        var voteCheckBox = "";

 						var tabl_prod = "<tr id='noderow_"+bpN+"' class='tblrow text-center"+isDisabled+"'> \
 								<td class='c0 text-left' id='c0_"+bpN+"'>"+""+voteCheckBox+" "+(nodesBPCount)+""+response_time+" </td> \
 								<td class='c1' id='c1_"+bpN+"'>"+blockProducerList[bp_].bp_name +"</td> \
 								<td class='c2' id='c2_"+bpN+"'>"+lastCheck+"</td> \
 								<td class='c3' id='c3_"+bpN+"'>"+lastNodeBlock+"</td> \
								<td class='c5' id='c5_"+bpN+"'>"+lastNodeBlockProducedTime+"</td> \
								<td class='c4' id='c4_"+bpN+"'>"+lastNodeBlockProduced+"</td> \
								<td class='c7' id='c7_"+bpN+"'>"+p2p_[0]+"</td> \
 								<td class='c8' id='c8_"+bpN+"'>"+node_http_url+"</td> \
 								<td class='c9' id='c9_"+bpN+"'>"+p2p_[1]+"</td> \
 								<td class='c6' id='c6_"+bpN+"'>"+nodeVersion+"</td> \
 								<td class='c12' id='c12_"+bpN+"'>--</td> \
 								<td class='c13' id='c13_"+bpN+"'>--</td> \
 								<td class='c10' id='c10_"+bpN+"'>"+blockProducerList[bp_].organisation+"</td> \
 								<td class='c11' id='c11_"+bpN+"'>"+blockProducerList[bp_].location+"</td> \
 							</tr>"

                        fullTable += tabl_prod;
 						switch (badNodes[blockProducerList[bp_].bp_name]) {

 							case 0:
 								sort_ok += tabl_prod;
 								break;

 							case 1:
 								sort1_red += tabl_prod;
 								break;

 							case 2:
 								sort1_yell += tabl_prod;

 								break;

                            default:
 							case 3:
 								sort1_viol += tabl_prod;
 								break;

 						}

 		} else {
 			nodesCount++;
 			$('#nodeTable').append("<tr id='noderow_"+bpN+"' class='tblrow text-center'> \
 								<td class='cn0' id='c0_"+bpN+"'>"+""+(nodesCount)+""+response_time+" </td> \
 								<td class='cn1' id='c1_"+bpN+"'>"+blockProducerList[bp_].bp_name +"</td> \
 								<td class='cn2' id='c2_"+bpN+"'>"+lastCheck+"</td> \
 								<td class='cn3' id='c3_"+bpN+"'>"+lastNodeBlock+"</td> \
								<td class='cn4' id='c7_"+bpN+"'>"+ p2p_[0] +"</td> \
 								<td class='cn5  id='c8_"+bpN+"'>"+node_http_url+"</td> \
 								<td class='cn6' id='c9_"+bpN+"'>"+p2p_[1]+"</td> \
 								<td class='cn7' id='c6_"+bpN+"'>"+nodeVersion+"</td> \
 								<td class='cn8' id='cn10_"+bpN+"'>"+blockProducerList[bp_].organisation+"</td> \
 								<td class='cn9' id='cn11_"+bpN+"'>"+blockProducerList[bp_].location+"</td> \
 							</tr>");

 		}

	}

	if (!badNodesSorting){
		badNodesSorting = 1;
		$('#bpTable').append(sort_ok);
		$('#bpTable').append(sort1_yell);
		$('#bpTable').append(sort1_viol);
        $('#bpTable').append(sort1_red);
  	} else {
		badNodesSorting = 0;
		$('#bpTable').append(fullTable);
  	}

    //if (!isMobile())
    	//$("#bpTable").tableDnD();

	$('[data-toggle="tooltip"]').tooltip();

    $('#infoMsg').html("");

	showHideNodeInfo(false);
	GetNodesLocations();
}

function sortNodes(){
	console.log(badNodes);
	initNodesList()
}

function GetNodesLocations(){
	BPLocations = [];
    if (blockProducerList.length == 0) return;

   	for (var bp_ in blockProducerList){
        if (blockProducerList[bp_].bp) {

			var h_ = blockProducerList[bp_].http_server_address.split(":");
			var p2p_ = blockProducerList[bp_].p2p_server_address.split(":");

			var node_addr = h_[0];
			var node_api_port = h_[1];
			var protocol = "http://";

			if (blockProducerList[bp_].https_server_address){
				var hs_ = blockProducerList[bp_].https_server_address.split(":");
				node_addr = hs_[0];
				node_api_port = hs_[1];
			}

			if (node_addr == "0.0.0.0") node_addr = p2p_[0];


	        //console.log(bp_);
	 	 	var addr = blockProducerList[bp_].node_addr;
	        $.get( "http://ip.kitpes.com/?id="+bp_+"&ip=" + node_addr, function( data_str) {
	        	var data = JSON.parse(data_str);
	  			BPLocations.push({id: data.id, label:blockProducerList[data.id].organisation, lat:data.lat, lng: data.lon })
			});
		}


	}
	//console.log(BPLocations);
    //if (document.getElementById('map'))
	//	initMap();
}



//-------------------------------------------------------------------------------
