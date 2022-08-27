


function print(a)
{
    console.log(a)
}


function RandInt(min, max)
{
    return Math.floor(Math.random() * max) - min;
}


function GetTime()
{ 
    var dateObj = new Date();
    return dateObj.getTime();
}


//Timer class
function Timer(interval)
{
    this.interval = interval
    this.targtime = GetTime() + this.interval
    
    this.Check = function()
    {
        if(GetTime() >= this.targtime)
        {
            
            return true;
        }
        else
        {
            return false;
        }
    }
    this.Reset = function()
    {
        this.targtime = GetTime() + this.interval
    }
    
    this.CheckRS = function()
    {
        if(this.Check())
        {
            this.Reset()
            return true;
        }
        return 0;
    }
}

module.exports = {print, RandInt, GetTime, Timer}