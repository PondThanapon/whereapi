var express = require("express");
var app = express();

var mysql = require("mysql");
var bodyParser = require("body-parser");
var moment = require("moment");

app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: true }));

// สร้างตัวแปรสำหรับเชื่อมต่อกับ Database MySQL
var con = mysql.createConnection({
  host: "192.168.64.2",
  port: "3306",
  user: "root", //username ของ database
  password: "", //empty for window
  database: "w_db" // ชื่อ Database
});

// var con = mysql.createConnection({
//   host: "us-cdbr-iron-east-04.cleardb.net",
//   port: "3306",
//   user: "b65a8eeaf2fbcc",  //username ของ database
//   password: "2494f649", //empty for window
//   database: "heroku_b83e5acf5a74438"  // ชื่อ Database
// });

var port = process.env.PORT || 1234;

var server = app.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("--------start---------");
});

con.connect(function(error) {
  // connect database
  if (error) console.log(error);
  else console.log("connected"); // ขึ้นเมื่อ Connect สำเร็จ
});

app.get("/", (req, res) => {
  res.send(`
		<link href="https://fonts.googleapis.com/css?family=Quicksand:700" rel="stylesheet">
		<div style="display: flex;flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: 'Quicksand', san-serif;">
      <h1>Welcome To Where API </h1>
    </div>
	`);
});

app.get("/hello", (req, res) => res.json({ message: "Hello" }));

// Login
app.get("/user", function(req, res) {
  let VehicleData; // ดึงข้อมูลของพาหนะมาใส่ในตัวแปรนี้
  con.query(`select * from Vehicle`, function(error, rowsVehicle, fields) {
    if (error) console.log(error);
    else {
      VehicleData = JSON.parse(JSON.stringify(rowsVehicle));
    }
  });

  // สร้างคำสั่ง Sql 3 แบบ
  // - ค้นหาจาก username password สำหรับใช้ Login
  // - ค้นหาจาก user_id
  // - ค้นหาทั้งหมด
  let cmd = res.req.query.username
    ? `select * from driver where username = ${res.req.query.username} and  password = ${res.req.query.password}`
    : res.req.query.user_id
    ? `select * from driver where user_id = ${res.req.query.user_id}`
    : `select * from driver`;

  con.query(cmd, function(error, rows, fields) {
    if (error) console.log(error);
    else {
      let temp = JSON.parse(JSON.stringify(rows));
      if (temp.length > 0) {
        con.query(
          // เก็บ log เมื่อมีการ Login
          `INSERT INTO LogUser (user_id,datetime) Value (${
            rows[0].user_id
          },'${moment().format("YYYY-MM-DD hh:mm:ss")}')`,
          function(error, rows, fields) {
            if (error) console.log(error);
            else {
              console.log("LogUser ", rows);
            }
          }
        );
      }
      // นำข้อมูลของพาหนะที่ผู้้ใช้ Login ใส่ในข้อมูลและส่งกลับไปที่ App ด้วย
      let result = [];
      temp.map(item => {
        if (item.Vehicle_ID == 0) {
          item.Vehicle_Name = "-";
          item.Vehicle_Type = "-";
          result.push(item);
        } else {
          let index = VehicleData.findIndex(
            x => x.Vehicle_ID == item.Vehicle_ID
          );
          console.log(VehicleData[index]);
          item.Vehicle_Name = VehicleData[index].Vehicle_Name || "-";
          item.Vehicle_Type = VehicleData[index].Vehicle_Type || "-";
          result.push(item);
        }
      });
      console.log("result :::: ", result);
      res.send(result);
    }
  });
});

//Register สมัครสมาชิก
app.post("/regis", function(req, res) {
  console.log(res.req.body);
  con.query(
    `INSERT INTO driver (Username,Password,Firstname,Lastname,address,Phone_num) Value 
  (${res.req.body.username},${res.req.body.password},${res.req.body.Firstname},${res.req.body.Lastname},${res.req.body.address},${res.req.body.Phone_num})`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//Edit Profile แก้ไขข้อมูลส่วนตัว
app.post("/editProfile", function(req, res) {
  console.log(res.req.body);

  con.query(
    `UPDATE driver SET Firstname = ${res.req.body.Firstname},Lastname = ${res.req.body.Lastname} ,address = ${res.req.body.address} ,Phone_num = ${res.req.body.Phone_num} WHERE user_id = ${res.req.body.user_id}`,
    // con.query(`UPDATE driver SET Username = ${res.req.body.username}, Password = ${res.req.body.password}, Firstname = ${res.req.body.Firstname},Lastname = ${res.req.body.Lastname},address = ${res.req.body.address},Phone_num = ${res.req.body.Phone_num} WHERE user_id = ${res.req.body.id};`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//Check Work Status ตรวจสอบสถานะของการทำงานล่าสุดของคนขับ
app.get("/CheckWorkStatus", function(req, res) {
  console.log(res.req.query);
  con.query(
    `select * from WorkTime where user_id = ${res.req.query.user_id} ORDER BY WT_ID DESC LIMIT 1`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//Start Working เริ่มทำงาน
app.post("/StartWorking", function(req, res) {
  // สร้างเวลาการทำงาน
  con.query(
    `INSERT INTO WorkTime (user_id,Time_In,vehicle_id) Value (${
      res.req.body.user_id
    },'${moment().format("YYYY-MM-DD hh:mm:ss")}',${res.req.body.Vehicle_ID})`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//End Working จบการทำงาน
app.post("/EndWorking", function(req, res) {
  // ใส่ข้อมูลเวลาออกงาน และ เปลี่ยนสถานะเป็น 1 = จบงาน
  con.query(
    `UPDATE WorkTime SET Time_Out = '${moment().format(
      "YYYY-MM-DD hh:mm:ss"
    )}', status = '1' WHERE WT_ID = ${res.req.body.WT_ID}`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//Work History ประวัติการทำงาน
app.get("/WorkStatusHistory", function(req, res) {
  let VehicleData; // ดึงข้อมูลพาหนะของคนขับใส่ในตัวแปรนี้
  con.query(
    `select * from Vehicle where user_id = ${res.req.query.user_id} `,
    function(error, rowsVehicle, fields) {
      if (error) console.log(error);
      else {
        VehicleData = JSON.parse(JSON.stringify(rowsVehicle));
      }
    }
  );

  // ดึงข้อมูลประวัติการทำงานทั้งหมด
  con.query(
    `select * from WorkTime where user_id = ${res.req.query.user_id} ORDER BY WT_ID DESC`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        // console.log(rows)
        let temp = JSON.parse(JSON.stringify(rows));
        let result = [];
        // หาค่าเวลาทำงาน
        temp.map(item => {
          let diff = moment(item.Time_Out).diff(moment(item.Time_In));
          let diffDuration = moment.duration(diff);
          item.workTime = item.Time_Out
            ? `${diffDuration.hours()}:${diffDuration.minutes()}`
            : "-";

          // หาค่าชื่อและประเภทของรถจาก ID
          let index = VehicleData.findIndex(
            x => x.Vehicle_ID == item.Vehicle_ID
          );

          item.Vehicle_Name =
            (VehicleData &&
              VehicleData[index] &&
              VehicleData[index].Vehicle_Name) ||
            "ไม่พบพาหนะ";
          item.Vehicle_Type =
            (VehicleData &&
              VehicleData[index] &&
              VehicleData[index].Vehicle_Type) ||
            "ไม่พบประเภทพาหนะ";

          result.push(item);
        });
        console.log("result :::: ", result);
        res.send(result);
      }
    }
  );
});

//Start BreakDown เริ่มสถานะพาหนะเสีย
app.post("/StartBreakDown", function(req, res) {
  //เปลี่ยนสถานะพาหนะเสียใน Table พาหนะ
  con.query(
    `UPDATE Vehicle SET BreakDown_Status = '1' WHERE Vehicle_ID = ${res.req.body.Vehicle_ID}`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
      }
    }
  );
  // เพิ่มประวัติพาหนะเสียใน Table Breakdown
  con.query(
    `INSERT INTO Breakdown (Time, Vehicle_ID, status) Value ('${moment().format(
      "YYYY-MM-DD hh:mm:ss"
    )}',${res.req.body.Vehicle_ID},${res.req.body.status})`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//End BreakDown หยุดสถานะพาหนะเสีย
app.post("/EndBreakDown", function(req, res) {
  con.query(
    `UPDATE Vehicle SET BreakDown_Status = 0 WHERE Vehicle_ID = '${res.req.body.Vehicle_ID}'`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//////////////////////////////////////////////////////////////////////////////////////////
//Update Location อัพเดท Lat long ของพาหนะจากที่ส่ง ID มา
app.post("/UpdateLocation", function(req, res) {
  console.log("Vehicle_ID ::: ", res.req.body.Vehicle_ID);
  con.query(
    `UPDATE Vehicle SET  lat = '${res.req.body.lat}', lon = '${res.req.body.lon}' WHERE Vehicle_ID = '${res.req.body.Vehicle_ID}'`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log("====update   ", rows);
        res.send(rows);
      }
    }
  );
});

//////////////////////////////////////////////////////////////////////////////////////////
//get busStop ดึงข้อมูลป้ายรถ
app.get("/busStop", function(req, res) {
  let cmd = "";
  cmd = res.req.query.searchText
    ? `select * from tb_busstop where busline_name LIKE '%${res.req.query.searchText}%'`
    : res.req.query.busline_name
    ? `select * from tb_busstop where busline_name = ${res.req.query.busline_name}`
    : `select * from tb_busstop`;

  con.query(cmd, function(error, rows, fields) {
    if (error) console.log(error);
    else {
      // console.log(rows);
      res.send(rows);
    }
  });
});

// getBusStopWithSearch ดึงข้อมูลของป้ายรถจากการค้นหา
app.get("/SearchBusStop", function(req, res) {
  // นำค่าค้นหาใส่ใน Log

  con.query(
    `select * from LogSearch where SearchText = '${res.req.query.searchText}' `,
    function(error, resultSearch, fields) {
      if (error) console.log(error);
      else {
        console.log("resultSearch :::: ",JSON.parse(JSON.stringify(resultSearch)));
        let result = JSON.parse(JSON.stringify(resultSearch))
        if(result.length > 0){
          console.log('same')
          con.query(
            `UPDATE LogSearch SET count = count + 1 where SearchText = '${res.req.query.searchText}'`,
            function(error, rows, fields) {
              if (error) console.log(error);
              else {
                console.log(rows);
              }
            }
          );

        }
        else {
          console.log('new')
          con.query(
            `INSERT INTO LogSearch (SearchText,datetime) Value ('${
              res.req.query.searchText
            }','${moment().format("YYYY-MM-DD hh:mm:ss")}')`,
            function(error, rows, fields) {
              if (error) console.log(error);
              else {
                console.log(rows);
              }
            }
          )
        }
      }
    }
  );
  



  

  let cmd = "";
  cmd =
    res.req.query.searchText &&
    `select * from tb_busstop where busstop_name LIKE '%${res.req.query.searchText}%'`;
  // ค้นหาป้ายรถจากคำที่ได้รับ
  con.query(cmd, function(error, rows, fields) {
    let result = [];
    if (error) console.log(error);
    else {
      // console.log(JSON.parse(JSON.stringify(rows)))
      let temp = JSON.parse(JSON.stringify(rows));
      var newArray = temp.reduce(function(acc, curr) {
        var findIfExist = acc.indexOf(curr.busline_name);
        if (findIfExist === -1) {
          acc.push(curr.busline_name);
        }
        return acc;
      }, []);
      console.log("newArray ::: ", newArray);
      console.log("newArray length ::: ", newArray.length);

      if (newArray.length > 0) {
        // ค้นหาสายรถจากป้ายที่เจอทั้งหมด
        cmd2 = `SELECT * FROM tb_busline WHERE busline_name IN (${newArray})`;
        console.log(cmd2);
        con.query(cmd2, function(error, rows2, fields) {
          if (error) console.log(error);
          else {
            console.log("rows2 ::: ", JSON.parse(JSON.stringify(rows2)));
            result.push(JSON.parse(JSON.stringify(rows2)));
          }
        });

        // ดึงข้อมูลป้ายทั้งหมดจากสายที่ค้นหาได้
        cmd3 = `SELECT * FROM tb_busstop WHERE busline_name IN (${newArray})`;
        console.log(cmd3);
        con.query(cmd3, function(error, rows3, fields) {
          if (error) console.log(error);
          else {
            console.log("rows3 ::: ", JSON.parse(JSON.stringify(rows3)));
            result.push(JSON.parse(JSON.stringify(rows3)));

            console.log(result);
            res.send(result);
          }
        });
      }
      else {
        cmd2 = `SELECT * FROM tb_busline WHERE busline_name`;
        console.log(cmd2);
        con.query(cmd2, function(error, rows2, fields) {
          if (error) console.log(error);
          else {
            console.log("rows2 ::: ", JSON.parse(JSON.stringify(rows2)));
            result.push(JSON.parse(JSON.stringify(rows2)));
          }
        });

        // ดึงข้อมูลป้ายทั้งหมดจากสายที่ค้นหาได้
        cmd3 = `SELECT * FROM tb_busstop WHERE busline_name `;
        console.log(cmd3);
        con.query(cmd3, function(error, rows3, fields) {
          if (error) console.log(error);
          else {
            console.log("rows3 ::: ", JSON.parse(JSON.stringify(rows3)));
            result.push(JSON.parse(JSON.stringify(rows3)));

            console.log("result3333 :::", result);
            res.status(404).send(result);
          }
        });
      }
    }
  });
});

//get busLine ดึงข้อมูลสายรถ
app.get("/busLine", function(req, res) {
  console.log("search text ::: ", res.req.query);
  let cmd = "";
  cmd = res.req.query.searchText
    ? `select * from tb_busline where busline_name LIKE '%${res.req.query.searchText}%'`
    : res.req.query.busline_code
    ? `select * from tb_busline where busline_code = ${res.req.query.busline_code}`
    : `select * from tb_busline`;

  con.query(cmd, function(error, rows, fields) {
    if (error) console.log(error);
    else {
      // console.log(rows);
      res.send(rows);
    }
  });
});

//get Vehicle ดึงข้อมูลรถทั้งหมด
app.get("/getVehicle", function(req, res) {
  con.query(`select * from Vehicle where user_id = 1 `, function(
    error,
    rows,
    fields
  ) {
    if (error) console.log(error);
    else {
      console.log(rows);
      res.send(rows);
    }
  });
});

//get Vehicle query ดึงข้อมูลรถที่ต้องการด้วย Vehicle ID
app.get("/getVehicleQuery", function(req, res) {
  con.query(
    `select * from Vehicle where Vehicle_ID = ${res.req.query.Vehicle_ID}`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//get Vehicle Active ดึงข้อมูลรถที่ใช้งาน
app.get("/getVehicleActive", function(req, res) {
  // con.query(`select * from Vehicle where Active = 1 and  Vehicle_Type = ${res.req.query.Vehicle_Type}  `, function(
  con.query(`select * from Vehicle where Active = 1`, function(
    error,
    rows,
    fields
  ) {
    if (error) console.log(error);
    else {
      // console.log(rows);
      res.send(rows);
    }
  });
});

//get Vehicle Active ดึงข้อมูลรถโดยค้นหาจากสายรถ
app.get("/getVehicleActiveQuery", function(req, res) {
  con.query(
    `select * from Vehicle where Active = 1 and Vehicle_Type = ${res.req.query.Vehicle_Type} and busline_code IN (${res.req.query.lineQuery}) `,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//Select Vehicle เลือกพาหนะที่ใช้
app.post("/selectVehicle", function(req, res) {
  // เปลี่ยนค่าพาหนะที่ใช้ของคนขับ
  con.query(
    `UPDATE driver SET Vehicle_ID = ${res.req.body.Vehicle_ID} WHERE user_id = ${res.req.body.user_id}`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
      }
    }
  );
  // เปลี่ยนค่าสถานะพาหนะทั้งหมดเป็น 0 = ไม่ใช้งาน
  con.query(
    `UPDATE Vehicle SET Active = '0' WHERE user_id = ${res.req.body.user_id}`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        // res.send(rows)
      }
    }
  );
  // เปลี่ยนค่าสถานะพาหนะที่เลือกเป็น 1 = ใช้งาน
  con.query(
    `UPDATE Vehicle SET Active = '1' WHERE Vehicle_ID = ${res.req.body.Vehicle_ID}`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});

//Register Vehicle เพิ่มพาหนะ
app.post("/regisVehicle", function(req, res) {
  console.log(res.req.body);
  con.query(
    `INSERT INTO Vehicle (Vehicle_Name,Vehicle_Type,busline_code,user_id) Value (${res.req.body.Vehicle_Name},${res.req.body.Vehicle_Type},${res.req.body.busline_code},${res.req.body.user_id})`,
    function(error, rows, fields) {
      if (error) console.log(error);
      else {
        console.log(rows);
        res.send(rows);
      }
    }
  );
});
