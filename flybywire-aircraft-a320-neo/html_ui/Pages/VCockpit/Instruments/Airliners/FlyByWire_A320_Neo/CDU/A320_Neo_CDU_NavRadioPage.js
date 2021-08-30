class CDUNavRadioPage {
    static ShowPage(mcdu) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.NavRadioPage;
        mcdu.activeSystem = 'FMGC';
        mcdu.refreshPageCallback = () => {
            CDUNavRadioPage.ShowPage(mcdu);
        };
        mcdu.returnPageCallback = () => {
            CDUNavRadioPage.ShowPage(mcdu);
        };
        const radioOn = mcdu.isRadioNavActive();
        let vor1FrequencyCell = "";
        let vor1CourseCell = "";
        let ilsFrequencyCell = "";
        let ilsCourseCell = "";
        let adf1FrequencyCell = "";
        let adf1BfoOption = "";
        let vor2FrequencyCell = "";
        let vor2CourseCell = "";
        let adf2FrequencyCell = "";
        let adf2BfoOption = "";
        CDUNavRadioPage._timer = 0;
        mcdu.pageUpdate = () => {
            CDUNavRadioPage._timer++;
            if (CDUNavRadioPage._timer >= 5) {
                CDUNavRadioPage.ShowPage(mcdu);
            }
        };
        if (!radioOn) {
            vor1FrequencyCell = "[\xa0]/[\xa0\xa0.\xa0]";
            const vor1Beacon = mcdu.radioNav.getVORBeacon(1);
            const vor1Ident = vor1Beacon && vor1Beacon.ident.length >= 2 && vor1Beacon.ident.length <= 3 ? vor1Beacon.ident : "";
            if (mcdu.vor1Frequency != 0 && !mcdu.vor1IdIsPilotEntered && mcdu.vor1FreqIsPilotEntered) {
                vor1FrequencyCell = "{small}" + vor1Ident.padStart(3, "\xa0") + "{end}" + "/" + mcdu.vor1Frequency.toFixed(2);
            } else if (mcdu.vor1Frequency != 0 && mcdu.vor1IdIsPilotEntered && !mcdu.vor1FreqIsPilotEntered) {
                vor1FrequencyCell = mcdu.vor1IdPilotValue.padStart(3, "\xa0") + "/" + "{small}" + mcdu.vor1Frequency.toFixed(2) + "{end}";
            }
            mcdu.onLeftInput[0] = (value) => {
                const numValue = parseFloat(value);
                if (value === FMCMainDisplay.clrValue) {
                    mcdu.vor1FreqIsPilotEntered = false;
                    mcdu.vor1IdIsPilotEntered = false;
                    mcdu.vor1Frequency = 0;
                    mcdu.vor1Course = 0;
                    mcdu.radioNav.setVORActiveFrequency(1, 0);
                    CDUNavRadioPage.ShowPage(mcdu);
                } else if (!isFinite(numValue) && value.length >= 2 && value.length <= 3) {
                    mcdu.getOrSelectVORsByIdent(value, (navaids) => {
                        if (navaids) {
                            mcdu.vor1IdIsPilotEntered = true;
                            mcdu.vor1FreqIsPilotEntered = false;
                            mcdu.vor1IdPilotValue = value;
                            mcdu.vor1Frequency = navaids.infos.frequencyMHz;
                            mcdu.radioNav.setVORActiveFrequency(1, mcdu.vor1Frequency);
                            mcdu.vor1Course = 0;
                            mcdu.requestCall(() => {
                                CDUNavRadioPage.ShowPage(mcdu);
                            });
                        } else {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        }
                    });
                } else if (isFinite(numValue)) {
                    if (!/^\d{3}(\.\d{1,2})?$/.test(value) || !RadioNav.isHz50Compliant(numValue)) {
                        mcdu.addNewMessage(NXSystemMessages.formatError);
                        return false;
                    }
                    if (numValue < 108 || numValue > 117.95) {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                        return false;
                    }
                    mcdu.vor1IdIsPilotEntered = false;
                    mcdu.vor1FreqIsPilotEntered = true;
                    if (numValue != mcdu.vor1Frequency) {
                        mcdu.vor1Course = 0;
                    }
                    mcdu.vor1Frequency = numValue;
                    if (mcdu.isRadioNavActive()) {
                        mcdu.requestCall(() => {
                            CDUNavRadioPage.ShowPage(mcdu);
                        });
                    } else {
                        mcdu.radioNav.setVORStandbyFrequency(1, numValue).then(() => {
                            mcdu.radioNav.swapVORFrequencies(1);
                            mcdu.requestCall(() => {
                                CDUNavRadioPage.ShowPage(mcdu);
                            });
                        });
                    }
                } else {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                }
            };
            vor1CourseCell = "[\xa0]";
            if (mcdu.vor1Course > 0) {
                vor1CourseCell = mcdu.vor1Course.toFixed(0).padStart(3, "0");
            }
            mcdu.onLeftInput[1] = (value) => {
                const numValue = parseFloat(value);
                if (isFinite(numValue) && numValue > 0 && numValue <= 360) {
                    SimVar.SetSimVarValue("K:VOR1_SET", "number", numValue).then(() => {
                        mcdu.vor1Course = numValue;
                        mcdu.requestCall(() => {
                            CDUNavRadioPage.ShowPage(mcdu);
                        });
                    });
                } else if (value === FMCMainDisplay.clrValue) {
                    mcdu.vor1Course = 0;
                    CDUNavRadioPage.ShowPage(mcdu);
                } else {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                }
            };
            ilsFrequencyCell = "[\xa0\xa0]/[\xa0\xa0.\xa0]";
            ilsCourseCell = "";
            if (mcdu.ilsFrequency != 0) {
                if (mcdu._ilsFrequencyPilotEntered) {
                    const ilsIdent = mcdu.radioNav.getILSBeacon(1);
                    ilsFrequencyCell = `{small}${ilsIdent.ident.trim().padStart(4, "\xa0")}{end}/${mcdu.ilsFrequency.toFixed(2)}`;
                    ilsCourseCell = "{small}F" + ilsIdent.course.toFixed(0).padStart(3, "0") + "{end}";
                } else if (mcdu.ilsAutoTuned) {
                    ilsFrequencyCell = `{small}${mcdu.ilsAutoIdent.padStart(4, "\xa0")}/${mcdu.ilsFrequency.toFixed(2)}{end}`;
                    ilsCourseCell = `{small}F${mcdu.ilsAutoCourse.toFixed(0).padStart(3, "0")}{end}`;
                }
            }
            mcdu.onLeftInput[2] = (value) => {
                if (mcdu.setIlsFrequency(value)) {
                    CDUNavRadioPage.ShowPage(mcdu);
                }
            };
            adf1FrequencyCell = "[\xa0]/[\xa0\xa0\xa0.]";
            {
                const [freq, pilotFreq, ident, pilotIdent] = Fmgc.NavRadioManager.instance.ndbSelector.getFmsTuned(1);
                if (freq) {
                    adf1FrequencyCell = `{${pilotIdent ? 'big' : 'small'}}${ident || '[\xa0]'}{end}/{${pilotFreq ? 'big' : 'small'}}${freq.toFixed(1)}{end}`;
                    adf1BfoOption = "<ADF1 BFO";
                }
            }
            mcdu.onLeftInput[4] = (value) => {
                const numValue = parseFloat(value);
                if (!isFinite(numValue) && value.length >= 2 && value.length <= 3) {
                    mcdu.getOrSelectNDBsByIdent(value, (navaid) => {
                        if (navaid) {
                            Fmgc.NavRadioManager.instance.ndbSelector.setPilotNdb(1, navaid);
                            mcdu.requestCall(() => {
                                CDUNavRadioPage.ShowPage(mcdu);
                            });
                        } else {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        }
                    });
                } else if (isFinite(numValue)) {
                    if (!/^\d{3,4}(\.\d{1})?$/.test(value)) {
                        mcdu.addNewMessage(NXSystemMessages.formatError);
                        return false;
                    }
                    if (numValue < 190 || numValue > 1750) {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                        return false;
                    }
                    Fmgc.NavRadioManager.instance.ndbSelector.setPilotFrequency(1, numValue);
                } else if (value === FMCMainDisplay.clrValue) {
                    // TODO clear selection
                    CDUNavRadioPage.ShowPage(mcdu);
                } else {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                }
            };
        }

        if (!radioOn) {
            vor2FrequencyCell = "[\xa0\xa0.\xa0]/[\xa0]";
            const vor2Beacon = mcdu.radioNav.getVORBeacon(2);
            const vor2Ident = vor2Beacon && vor2Beacon.ident.length >= 2 && vor2Beacon.ident.length <= 3 ? vor2Beacon.ident : "";
            if (mcdu.vor2Frequency != 0 && mcdu.vor2FreqIsPilotEntered && !mcdu.vor2IdIsPilotEntered) {
                vor2FrequencyCell = mcdu.vor2Frequency.toFixed(2) + "/" + "{small}" + vor2Ident.padEnd(3, "\xa0") + "{end}";
            } else if (mcdu.vor2Frequency != 0 && !mcdu.vor2FreqIsPilotEntered && mcdu.vor2IdIsPilotEntered) {
                vor2FrequencyCell = "{small}" + mcdu.vor2Frequency.toFixed(2) + "{end}" + "/" + mcdu.vor2IdPilotValue.padEnd(3, "\xa0");
            }
            mcdu.onRightInput[0] = (value) => {
                const numValue = parseFloat(value);
                if (value === FMCMainDisplay.clrValue) {
                    mcdu.vor2FreqIsPilotEntered = false;
                    mcdu.vor2IdIsPilotEntered = false;
                    mcdu.vor2Frequency = 0;
                    mcdu.vor2Course = 0;
                    mcdu.radioNav.setVORActiveFrequency(2, 0);
                    CDUNavRadioPage.ShowPage(mcdu);
                } else if (!isFinite(numValue) && value.length >= 2 && value.length <= 3) {
                    mcdu.getOrSelectVORsByIdent(value, (navaids) => {
                        if (navaids) {
                            mcdu.vor2IdIsPilotEntered = true;
                            mcdu.vor2FreqIsPilotEntered = false;
                            mcdu.vor2IdPilotValue = value;
                            mcdu.vor2Frequency = navaids.infos.frequencyMHz;
                            mcdu.radioNav.setVORActiveFrequency(2, mcdu.vor2Frequency);
                            mcdu.vor2Course = 0;
                            mcdu.requestCall(() => {
                                CDUNavRadioPage.ShowPage(mcdu);
                            });
                        } else {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        }
                    });
                } else if (isFinite(numValue)) {
                    if (!/^\d{3}(\.\d{1,2})?$/.test(value) || !RadioNav.isHz50Compliant(numValue)) {
                        mcdu.addNewMessage(NXSystemMessages.formatError);
                        return false;
                    }
                    if (numValue < 108 || numValue > 117.95) {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                        return false;
                    }
                    mcdu.vor2FreqIsPilotEntered = true;
                    mcdu.vor2IdIsPilotEntered = false;
                    if (numValue != mcdu.vor2Frequency) {
                        mcdu.vor2Course = 0;
                    }
                    mcdu.vor2Frequency = numValue;
                    if (mcdu.isRadioNavActive()) {
                        mcdu.requestCall(() => {
                            CDUNavRadioPage.ShowPage(mcdu);
                        });
                    } else {
                        mcdu.radioNav.setVORStandbyFrequency(2, numValue).then(() => {
                            mcdu.radioNav.swapVORFrequencies(2);
                            mcdu.requestCall(() => {
                                CDUNavRadioPage.ShowPage(mcdu);
                            });
                        });
                    }
                } else {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                }
            };
            vor2CourseCell = "[\xa0]";
            if (mcdu.vor2Course > 0) {
                vor2CourseCell = mcdu.vor2Course.toFixed(0).padStart(3, "0");
            }
            mcdu.onRightInput[1] = (value) => {
                const numValue = parseFloat(value);
                if (isFinite(numValue) && numValue > 0 && numValue <= 360) {
                    SimVar.SetSimVarValue("K:VOR2_SET", "number", numValue).then(() => {
                        mcdu.vor2Course = numValue;
                        mcdu.requestCall(() => {
                            CDUNavRadioPage.ShowPage(mcdu);
                        });
                    });
                } else if (value === FMCMainDisplay.clrValue) {
                    mcdu.vor2Course = 0;
                    CDUNavRadioPage.ShowPage(mcdu);
                } else {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                }
            };
            adf2FrequencyCell = "[\xa0]/[\xa0\xa0\xa0.]";
            {
                const [freq, pilotFreq, ident, pilotIdent] = Fmgc.NavRadioManager.instance.ndbSelector.getFmsTuned(2);
                if (freq) {
                    adf2FrequencyCell = `{${pilotIdent ? 'big' : 'small'}}${ident || '[\xa0]'}{end}/{${pilotFreq ? 'big' : 'small'}}${freq.toFixed(1)}{end}`;
                    adf2BfoOption = "<ADF1 BFO";
                }
            }
            mcdu.onRightInput[4] = (value) => {
                const numValue = parseFloat(value);
                if (!isFinite(numValue) && value.length >= 2 && value.length <= 3) {
                    mcdu.getOrSelectNDBsByIdent(value, (navaid) => {
                        if (navaid) {
                            Fmgc.NavRadioManager.instance.ndbSelector.setPilotNdb(2, navaid);
                            mcdu.requestCall(() => {
                                CDUNavRadioPage.ShowPage(mcdu);
                            });
                        } else {
                            mcdu.addNewMessage(NXSystemMessages.notInDatabase);
                        }
                    });
                } else if (isFinite(numValue)) {
                    if (!/^\d{3,4}(\.\d{1})?$/.test(value)) {
                        mcdu.addNewMessage(NXSystemMessages.formatError);
                        return false;
                    }
                    if (numValue < 190 || numValue > 1750) {
                        mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                        return false;
                    }
                    Fmgc.NavRadioManager.instance.ndbSelector.setPilotFrequency(2, numValue);
                } else if (value === FMCMainDisplay.clrValue) {
                    // TODO clear selection
                    CDUNavRadioPage.ShowPage(mcdu);
                } else {
                    mcdu.addNewMessage(NXSystemMessages.entryOutOfRange);
                }
            };
        }
        mcdu.setTemplate([
            ["RADIO NAV"],
            ["VOR1/FREQ", "FREQ/VOR2"],
            [vor1FrequencyCell + "[color]cyan", vor2FrequencyCell + "[color]cyan"],
            ["CRS", "CRS"],
            [vor1CourseCell + "[color]cyan", vor2CourseCell + "[color]cyan"],
            ["\xa0LS\xa0/FREQ"],
            [ilsFrequencyCell + "[color]cyan"],
            ["CRS"],
            [ilsCourseCell + "[color]cyan"],
            ["ADF1/FREQ", "FREQ/ADF2"],
            [adf1FrequencyCell + "[color]cyan", adf2FrequencyCell + "[color]cyan"],
            [""],
            [adf1BfoOption + "[color]inop", adf2BfoOption + "[color]inop"]
        ]);
    }
}
CDUNavRadioPage._timer = 0;
