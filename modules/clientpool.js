


const config = require("../config.json")
const mineflayer = require("mineflayer")
const socks = require('socks').SocksClient
const fs = require("fs");
const { GetTime, Timer ,print, RandInt} = require("./utils");
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')
const namesraw = fs.readFileSync(config.generate_offlines.gen_fn, "utf-8")
const namesdb = namesraw.split(/\r?\n/)

const mcdata = require("minecraft-data")(config.version)


require("./proxylib")

const NPCPos = []
function FindNPC()
{

}

function GenName()
{
    name_base = namesdb[RandInt(0, namesdb.length - 1)];
    return name_base + RandInt(0, 999999).toString()
}

//Client wrapper
function MCClient(name, proxy)
{
    //If the client is disconnected from the server
    this.disconnected = true;
    
    //If marked for deletion(client is no longer useful, i.e. after starter resources has been used up)
    this.destroyClient = false;
    
    //IGN of client
    this.name = name;

    //Timer for chat cooldown
    this.ChatTimer = new Timer(config.chat_cooldown);

    //Timer for reconnect throttling delay
    this.ReconnectTimer = new Timer(config.reconnect.delay)

    //Queue for chat messages to be sent
    this.msgQueue = []

    this.proxy = proxy

    //Initialize the MC client
    print("Creating new client with name " + this.name)
   
    this.CreateNewClient = function()
    {
        this.client = mineflayer.createBot({
            connect: client => {
            socks.createConnection({
                    proxy: 
                    {
                        host: this.proxy.host,
                        port: this.proxy.port,
                        type: 5
                    },
                    command: 'connect',
                    destination: 
                    {
                        host: config.ip,
                        port: config.port
                    }
                }, (err, info) => 
                {
                    if (err) 
                    {
                        console.log(err)
                        return
                    }
            
                client.setSocket(info.socket)
                client.emit('connect')
                })
            },
                username: this.name,
                host: config.ip,
                port: config.port,
                version : config.version,
                //password: process.argv[7]
            })
    }

    this.On = 
    {
        //On connect
        connect : function()
        {
            print("Client with name " + this.name + " connected.")
            
            this.disconnected = false
            //Update proxy counters
            this.proxy.connections++;
            this.proxy.reg_amount++;

        }.bind(this),

        //On end
        end : function()
        {
            print(this.name + ' Lost connection')
            this.disconnected = true
            this.proxy.connections--;

        }.bind(this),

        disconnect : function(packet)
        {
            print(this.name +' disconnected: ' + packet.reason)
        }.bind(this),


        packet : function(packet)
        {

        }.bind(this),
    }
    
    
    //print(this.name + " Created.")

    this.SendMessage = function()
    {
        if(this.msgQueue.length > 0)
        {
            var msg = this.msgQueue.shift();
            this.client.write("chat", 
            {
                "message" : msg
            })
            
        }
        
    }
    this.BindFunctions()
    {

        //Callbacks
        Object.keys(this.On).forEach(function(k)
        {
            this.client.on(k, this.On[k])
        })

        //load pathfinder
        bot.loadPlugin(pathfinder)
    }

    this.QueueMessage = function(msg)
    {
        this.msgQueue.push(msg)
    }
    this.Reconnect = function()
    {
        this.CreateNewClient()
        
    }
    this.Disconnect = function()
    {
        this.client.end("lol")
    }
    this.AutoReconnect = function()
    {
        //If not disconnected then break
        if(!this.disconnected)
        {
            return;
        }
        
        //If exceeded delay
        if(this.ReconnectTimer.CheckRS())
        {
            //this.ReconnectTimer.Reset()
            this.Reconnect();
        }


    }
    //Client looping stuff idk
    this.MaintainClient = function()
    {

        this.AutoReconnect()
        
    }

    //Run when client instance is created
    this.Run = function()
    {
        print("Initializing client " + name)
        this.QueueMessage(config.mass_register.reg_msg);
        this.QueueMessage(config.pay.pay_msg);
        this.ChatTimer.Reset()
        //I hope this is called very frequently
        //If not im fucked lol
        this.client.on('packet', function (packet) {
            if (config.log_packets) {
                print(packet)
                if (packet.data) {
                    print(packet.data.toString())
                }
            }
        //Message spammer
            if(this.ChatTimer.Check())
            {
                this.ChatTimer.Reset()
                this.SendMessage()
            }


        })
    }
    
    
}


function MCClientsPool(proxyP)
{
    this.clients = {}
    this.names_hist = []
    this.proxyPool = proxyP
    this.CreateClient = function(name, pw, proxy)
    {
        this.clients[name] = new MCClient(name, pw, proxy);
    }

    this.DeleteMarkedClient = function(k)
    {
        if(this.clients[k].destroyClient)
        {
            this.names_hist.push(k)
            delete this.clients[k];
        }

    }

    
    this.UpdateClients = function()
    {
        //Loops through each client
        Object.keys(this.clients).forEach(function(k)
        {
            //Maintains each client
            this.clients[k].MaintainClient()

            //Delete if marked for deletion
            DeleteMarkedClient(k);
        })
    }
    //Does not verify proxy count
    this.AddNewClients = function(n)
    {
        //vacantProxies = this.proxyList.GetVacantProxyCount();

        print("Generating " + n.toString() + " clients...")
        for(let i = 0; i < n; i++)
        {
            //Generate new offline name for client(cracked server only)
            let newName = GenName()
            //Create a new client instance 
            this.clients[newName] = new MCClient(newName, this.proxyList.GetValidProxy())
            //Call the above client's init function thing
            this.clients[newName].Run()
        }
    }

    this.CreateClients = function()
    {
        
        let active_clients = Object.keys(this.clients).length;
        print("Current number of clients: " + active_clients.toString())
        if(config.target_num_accounts <= active_clients)
        {
            return;
        }
        let proxy_count = this.proxyList.GetVacantProxyCount()
        if(proxy_count <= 0)
        {
            print("Not enough proxies")
            return;
        }
        let create_num = (config.target_num_accounts - active_clients)
        create_num = create_num > config.target_num_accounts ? config.target_num_accounts : create_num;
        create_num = create_num > proxy_count ? proxy_count : create_num;
        print("Adding new clients... --- CLIENT")
        this.AddNewClients(create_num);
    }

    this.WriteNameHist = function()
    {
        fs.WriteFileSync("../accs_hist/" + GetTime().toString() + ".txt" , this.names_hist.toString())
        this.names_hist = []
    }
}

module.exports = {MCClientsList};


