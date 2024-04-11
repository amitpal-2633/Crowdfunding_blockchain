import React, { useContext, createContext, useState, useRef, useEffect } from 'react';

import { Contract, providers } from "ethers";
import { ethers } from 'ethers';
import {
  CROWDFUNDING_ABI,
  CROWDFUNDING_ADDRESS
} from '../constants'
import Web3Modal from "web3modal";


const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  // True if user has connected their wallet, false otherwise
  const [walletConnected, setWalletConnected] = useState(false);
  // connected users address
  const [address, setAddress] = useState('');
  // contract
  const [contract, setContract] = useState('');


  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner=false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider)

      const {chainId} = await web3Provider.getNetwork();
      if(chainId !== 11155111) {
        alert("Please switch to the Goerli network!");
        throw new Error("Please switch to the Goerli network");
      }
      if(needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }
      return web3Provider;
    } catch (error) {
      console.error(error)
    }
  }

  const getContractInstance = async (providerOrSigner) => {
    return new Contract(
      CROWDFUNDING_ADDRESS,
      CROWDFUNDING_ABI,
      providerOrSigner
    );
  }

  const connect = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      setWalletConnected(true);
      const add = await signer.getAddress();
      setAddress(add)
      const ctx = await getContractInstance(signer)
      setContract(ctx)
    } catch (error) {
      console.error(error);
    }
  }

  const publishCampaign = async (form) => {
    try {
      const tx = await contract.createCampaign(
        address,
        form.title,
        form.description, 
        form.target,
        new Date(form.deadline).getTime(),
        form.image
      )
      await tx.wait()
    } catch (error) {
      console.error(error);
      alert(error.reason)
    }
  }

  const getCampaigns = async () => {
    try {
      const campaigns = await contract.getCampaigns()
      const parsedCampaings = campaigns.map((campaign, i) => ({
        owner: campaign.owner,
        title: campaign.title,
        description: campaign.description,
        target: ethers.utils.formatEther(campaign.targetAmount.toString()),
        deadline: campaign.deadline.toNumber(),
        amountCollected: ethers.utils.formatEther(campaign.amountCollected.toString()),
        image: campaign.image,
        pId: i
      }));
      return parsedCampaings;
    } catch (error) {
      console.error(error);
      alert(error.reason)
    }
  }

  const getUserCampaigns = async () => {
    try {
      const allCampaigns = await getCampaigns();
      const filteredCampaigns = allCampaigns.filter((campaign) => campaign.owner === address);
      return filteredCampaigns;
    } catch (error) {
      console.error(error);
      alert(error.reason)
    }
  }

  const donate = async (pId, amount) => {
    try {
      const data = await contract.donateToCampaign(pId, { value: ethers.utils.parseEther(amount)});
      return data;
    } catch (error) {
      console.error(error);
      alert(error.reason);
    }
  }

  const getDonations = async (pId) => {
    try {
      const donations = await contract.getDonators(pId)
      const numberOfDonations = donations[0].length;
      const parsedDonations = [];
      for(let i = 0; i < numberOfDonations; i++) {
        parsedDonations.push({
          donator: donations[0][i],
          donation: ethers.utils.formatEther(donations[1][i].toString())
        })
      }
      return parsedDonations;
    } catch (error) {
      console.error(error);
      alert(error.reason)
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connect()
    }
  }, [walletConnected]);

  return (
    <StateContext.Provider
      value={{ 
        address,
        contract,
        connect,
        createCampaign: publishCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export const useStateContext = () => useContext(StateContext);