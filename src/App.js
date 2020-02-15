

import React, { Component } from 'react';
import logo from './logo.svg';
// import './App.css';


export default class App extends Component {

  state = {
    data: []
  }

  fetchData = async () => {
    const response = await fetch('https://raw.githubusercontent.com/Hardeepcoder/fake_json/master/Users');
    const users = await response.json();
    this.setState({ data: users });

  }

  componentDidMount() {
    this.fetchData();
  }


  render() {
    return (
      <div>
        test
</div>
    )
  }

}