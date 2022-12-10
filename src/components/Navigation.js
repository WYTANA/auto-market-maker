import Navbar from "react-bootstrap/Navbar"

import logo from "../images/hills.png"

const Navigation = ({ account }) => {
  return (
    <Navbar className="my-3">
      <img
        alt="logo"
        src={logo}
        width="80"
        height="80"
        className="d-inline-block align-top mx-3"
      />
      <Navbar.Brand href="#">Black Hills Automated Market Maker</Navbar.Brand>
      <Navbar.Collapse className="justify-content-end">
        <Navbar.Text>{account}</Navbar.Text>
      </Navbar.Collapse>
    </Navbar>
  )
}

export default Navigation
