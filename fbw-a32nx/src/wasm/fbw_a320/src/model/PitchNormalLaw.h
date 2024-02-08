#ifndef RTW_HEADER_PitchNormalLaw_h_
#define RTW_HEADER_PitchNormalLaw_h_
#include "rtwtypes.h"
#include "PitchNormalLaw_types.h"
#include <cstring>

class PitchNormalLaw final
{
 public:
  struct rtDW_LagFilter_PitchNormalLaw_T {
    real_T pY;
    real_T pU;
    boolean_T pY_not_empty;
    boolean_T pU_not_empty;
  };

  struct rtDW_RateLimiter_PitchNormalLaw_T {
    real_T pY;
    boolean_T pY_not_empty;
  };

  struct rtDW_eta_trim_limit_lofreeze_PitchNormalLaw_T {
    real_T frozen_eta_trim;
    boolean_T frozen_eta_trim_not_empty;
  };

  struct rtDW_LagFilter_PitchNormalLaw_d_T {
    real_T pY;
    real_T pU;
    boolean_T pY_not_empty;
    boolean_T pU_not_empty;
  };

  struct rtDW_WashoutFilter_PitchNormalLaw_T {
    real_T pY;
    real_T pU;
    boolean_T pY_not_empty;
    boolean_T pU_not_empty;
  };

  struct rtDW_RateLimiter_PitchNormalLaw_a_T {
    real_T pY;
    boolean_T pY_not_empty;
  };

  struct BlockIO_PitchNormalLaw_T {
    real_T flare_Theta_c_deg;
    real_T flare_Theta_c_rate_deg_s;
  };

  struct D_Work_PitchNormalLaw_T {
    real_T Delay_DSTATE;
    real_T Delay_DSTATE_e;
    real_T Delay_DSTATE_n;
    real_T Delay_DSTATE_c;
    real_T Delay_DSTATE_l;
    real_T Delay_DSTATE_k;
    real_T Delay_DSTATE_d;
    real_T Delay_DSTATE_b;
    real_T Delay_DSTATE_en;
    real_T Delay_DSTATE_i;
    real_T Delay_DSTATE_g;
    real_T Delay_DSTATE_f;
    real_T Delay_DSTATE_g5;
    real_T Delay1_DSTATE;
    real_T Delay_DSTATE_j;
    real_T Delay_DSTATE_ca;
    real_T Delay1_DSTATE_i;
    real_T Delay_DSTATE_e1;
    real_T Delay_DSTATE_bg;
    real_T Delay_DSTATE_jv;
    real_T Delay_DSTATE_lf;
    real_T Delay_DSTATE_dv;
    real_T Delay_DSTATE_kd;
    real_T Delay_DSTATE_b5;
    real_T Delay_DSTATE_ku;
    real_T Delay_DSTATE_gl;
    real_T Delay1_DSTATE_l;
    real_T Delay_DSTATE_m;
    real_T Delay_DSTATE_k2;
    real_T Delay1_DSTATE_n;
    real_T Delay_DSTATE_mz;
    real_T Delay_DSTATE_jh;
    real_T Delay_DSTATE_dy;
    real_T Delay_DSTATE_e5;
    real_T Delay_DSTATE_gz;
    real_T Delay_DSTATE_lf1;
    real_T Delay_DSTATE_h;
    real_T Delay_DSTATE_ds;
    real_T Delay_DSTATE_jt;
    real_T Delay_DSTATE_o;
    real_T Delay_DSTATE_ej;
    real_T Delay_DSTATE_e4;
    real_T Delay_DSTATE_cl;
    uint8_T is_active_c6_PitchNormalLaw;
    uint8_T is_c6_PitchNormalLaw;
    uint8_T is_active_c7_PitchNormalLaw;
    uint8_T is_c7_PitchNormalLaw;
    uint8_T is_active_c8_PitchNormalLaw;
    uint8_T is_c8_PitchNormalLaw;
    uint8_T is_active_c9_PitchNormalLaw;
    uint8_T is_c9_PitchNormalLaw;
    uint8_T is_active_c2_PitchNormalLaw;
    uint8_T is_c2_PitchNormalLaw;
    boolean_T icLoad;
    boolean_T icLoad_p;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_b;
    rtDW_RateLimiter_PitchNormalLaw_a_T sf_RateLimiter_ct;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_fz;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_h;
    rtDW_RateLimiter_PitchNormalLaw_a_T sf_RateLimiter_nx;
    rtDW_RateLimiter_PitchNormalLaw_a_T sf_RateLimiter_i;
    rtDW_RateLimiter_PitchNormalLaw_a_T sf_RateLimiter_c2;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_o;
    rtDW_LagFilter_PitchNormalLaw_T sf_LagFilter_mf;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_pr;
    rtDW_RateLimiter_PitchNormalLaw_a_T sf_RateLimiter_f;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_m;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_f;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_ca;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_gr;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_c;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_g3;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_d;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_g;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_l;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_i;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_k4;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_m;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter_k;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_k;
    rtDW_WashoutFilter_PitchNormalLaw_T sf_WashoutFilter;
    rtDW_LagFilter_PitchNormalLaw_d_T sf_LagFilter_n;
    rtDW_eta_trim_limit_lofreeze_PitchNormalLaw_T sf_eta_trim_limit_upfreeze;
    rtDW_eta_trim_limit_lofreeze_PitchNormalLaw_T sf_eta_trim_limit_lofreeze;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_n;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_c;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter_p;
    rtDW_RateLimiter_PitchNormalLaw_T sf_RateLimiter;
    rtDW_LagFilter_PitchNormalLaw_T sf_LagFilter;
  };

  struct Parameters_PitchNormalLaw_T {
    real_T ScheduledGain_BreakpointsForDimension1[4];
    real_T ScheduledGain_BreakpointsForDimension1_n[4];
    real_T ScheduledGainAutopilotInput_BreakpointsForDimension1[7];
    real_T ScheduledGain_BreakpointsForDimension1_c[4];
    real_T ScheduledGainFlareLawInput_BreakpointsForDimension1[7];
    real_T ScheduledGain_BreakpointsForDimension1_p[4];
    real_T ScheduledGain_BreakpointsForDimension1_cx[4];
    real_T ScheduledGain_BreakpointsForDimension1_f[4];
    real_T ScheduledGain_BreakpointsForDimension1_b[4];
    real_T ScheduledGain1_BreakpointsForDimension1[5];
    real_T ScheduledGain_BreakpointsForDimension1_d[5];
    real_T ScheduledGain1_BreakpointsForDimension1_h[5];
    real_T LagFilter_C1;
    real_T LagFilter_C1_i;
    real_T WashoutFilter_C1;
    real_T LagFilter_C1_p;
    real_T WashoutFilter_C1_n;
    real_T LagFilter_C1_d;
    real_T WashoutFilter_C1_e;
    real_T LagFilter1_C1;
    real_T WashoutFilter_C1_b;
    real_T Subsystem1_C1;
    real_T Subsystem3_C1;
    real_T LagFilterdeltaetapos_C1;
    real_T LagFilter_C1_c;
    real_T WashoutFilter_C1_p;
    real_T Subsystem2_C1;
    real_T Subsystem_C1;
    real_T LagFilter_C1_pt;
    real_T WashoutFilter_C1_l;
    real_T LagFilter_C1_l;
    real_T WashoutFilter_C1_h;
    real_T LagFilter_C1_f;
    real_T WashoutFilter_C1_j;
    real_T LagFilter_C1_k;
    real_T DiscreteDerivativeVariableTs1_Gain;
    real_T DiscreteDerivativeVariableTs_Gain;
    real_T DiscreteDerivativeVariableTs2_Gain;
    real_T DiscreteDerivativeVariableTs1_Gain_i;
    real_T DiscreteDerivativeVariableTs_Gain_j;
    real_T DiscreteDerivativeVariableTs2_Gain_e;
    real_T DiscreteDerivativeVariableTs1_Gain_h;
    real_T DiscreteDerivativeVariableTs_Gain_o;
    real_T DiscreteDerivativeVariableTs2_Gain_g;
    real_T Subsystem1_Gain;
    real_T Subsystem3_Gain;
    real_T DiscreteDerivativeVariableTs1_Gain_j;
    real_T DiscreteDerivativeVariableTs_Gain_ol;
    real_T DiscreteDerivativeVariableTs2_Gain_m;
    real_T DiscreteDerivativeVariableTs1_Gain_m;
    real_T Subsystem2_Gain;
    real_T Subsystem_Gain;
    real_T DiscreteDerivativeVariableTs_Gain_b;
    real_T DiscreteDerivativeVariableTs2_Gain_c;
    real_T DiscreteDerivativeVariableTs1_Gain_c;
    real_T DiscreteDerivativeVariableTs_Gain_p;
    real_T DiscreteDerivativeVariableTs2_Gain_a;
    real_T DiscreteDerivativeVariableTs1_Gain_k;
    real_T DiscreteDerivativeVariableTs_Gain_c;
    real_T DiscreteDerivativeVariableTs2_Gain_p;
    real_T DiscreteTimeIntegratorVariableTs_Gain;
    real_T DiscreteDerivativeVariableTs_Gain_j3;
    real_T DiscreteDerivativeVariableTs_Gain_g;
    real_T DiscreteTimeIntegratorVariableTs_Gain_j;
    real_T DiscreteDerivativeVariableTs1_InitialCondition;
    real_T RateLimiterVariableTs_InitialCondition;
    real_T RateLimiterVariableTs1_InitialCondition;
    real_T RateLimiterVariableTs2_InitialCondition;
    real_T RateLimiterVariableTs3_InitialCondition;
    real_T RateLimiterDynamicVariableTs_InitialCondition;
    real_T RateLimiterVariableTs6_InitialCondition;
    real_T DiscreteDerivativeVariableTs_InitialCondition;
    real_T DiscreteDerivativeVariableTs2_InitialCondition;
    real_T DiscreteDerivativeVariableTs1_InitialCondition_l;
    real_T DiscreteDerivativeVariableTs_InitialCondition_o;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_d;
    real_T DiscreteDerivativeVariableTs1_InitialCondition_e;
    real_T RateLimiterVariableTs1_InitialCondition_b;
    real_T DiscreteDerivativeVariableTs_InitialCondition_b;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_j;
    real_T RateLimiterVariableTs8_InitialCondition;
    real_T RateLimiterVariableTs2_InitialCondition_f;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_h;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_m;
    real_T RateLimiterVariableTs5_InitialCondition;
    real_T DiscreteDerivativeVariableTs1_InitialCondition_n;
    real_T RateLimiterFlareLawTailstrikeProtection_InitialCondition;
    real_T RateLimiterDeltaEtaFlare_InitialCondition;
    real_T RateLimiterTheta_c_InitialCondition;
    real_T DiscreteDerivativeVariableTs_InitialCondition_n;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_a;
    real_T RateLimiterVariableTs9_InitialCondition;
    real_T DiscreteDerivativeVariableTs1_InitialCondition_j;
    real_T RateLimiterVariableTs_InitialCondition_o;
    real_T RateLimiterVariableTs3_InitialCondition_e;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_f;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_e;
    real_T RateLimiterVariableTs4_InitialCondition;
    real_T DiscreteDerivativeVariableTs_InitialCondition_a;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_di;
    real_T DiscreteDerivativeVariableTs1_InitialCondition_f;
    real_T DiscreteDerivativeVariableTs_InitialCondition_g;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_c;
    real_T DiscreteDerivativeVariableTs1_InitialCondition_g;
    real_T DiscreteDerivativeVariableTs_InitialCondition_h;
    real_T DiscreteDerivativeVariableTs2_InitialCondition_an;
    real_T RateLimiterVariableTs_InitialCondition_m;
    real_T DiscreteDerivativeVariableTs_InitialCondition_bb;
    real_T DiscreteDerivativeVariableTs_InitialCondition_p;
    real_T RateLimitereta_InitialCondition;
    real_T DiscreteTimeIntegratorVariableTs_LowerLimit;
    real_T DiscreteTimeIntegratorVariableTs_LowerLimit_h;
    real_T ScheduledGain_Table[4];
    real_T ScheduledGain_Table_b[4];
    real_T ScheduledGainAutopilotInput_Table[7];
    real_T ScheduledGain_Table_h[4];
    real_T ScheduledGainFlareLawInput_Table[7];
    real_T ScheduledGain_Table_i[4];
    real_T ScheduledGain_Table_g[4];
    real_T ScheduledGain_Table_ha[4];
    real_T ScheduledGain_Table_e[4];
    real_T ScheduledGain1_Table[5];
    real_T ScheduledGain_Table_hh[5];
    real_T ScheduledGain1_Table_c[5];
    real_T DiscreteTimeIntegratorVariableTs_UpperLimit;
    real_T DiscreteTimeIntegratorVariableTs_UpperLimit_p;
    real_T RateLimiterVariableTs_lo;
    real_T RateLimiterVariableTs1_lo;
    real_T RateLimiterVariableTs2_lo;
    real_T RateLimiterVariableTs3_lo;
    real_T RateLimiterVariableTs6_lo;
    real_T RateLimiterVariableTs1_lo_e;
    real_T RateLimiterVariableTs8_lo;
    real_T RateLimiterVariableTs2_lo_k;
    real_T RateLimiterVariableTs5_lo;
    real_T RateLimiterFlareLawTailstrikeProtection_lo;
    real_T RateLimiterDeltaEtaFlare_lo;
    real_T RateLimiterTheta_c_lo;
    real_T RateLimiterVariableTs9_lo;
    real_T RateLimiterVariableTs_lo_c;
    real_T RateLimiterVariableTs3_lo_b;
    real_T RateLimiterVariableTs4_lo;
    real_T RateLimiterVariableTs_lo_i;
    real_T RateLimitereta_lo;
    real_T RateLimiterVariableTs_up;
    real_T RateLimiterVariableTs1_up;
    real_T RateLimiterVariableTs2_up;
    real_T RateLimiterVariableTs3_up;
    real_T RateLimiterVariableTs6_up;
    real_T RateLimiterVariableTs1_up_p;
    real_T RateLimiterVariableTs8_up;
    real_T RateLimiterVariableTs2_up_m;
    real_T RateLimiterVariableTs5_up;
    real_T RateLimiterFlareLawTailstrikeProtection_up;
    real_T RateLimiterDeltaEtaFlare_up;
    real_T RateLimiterTheta_c_up;
    real_T RateLimiterVariableTs9_up;
    real_T RateLimiterVariableTs_up_n;
    real_T RateLimiterVariableTs3_up_i;
    real_T RateLimiterVariableTs4_up;
    real_T RateLimiterVariableTs_up_na;
    real_T RateLimitereta_up;
    boolean_T CompareToConstant_const;
    real_T FlareLawTheta_cDebug_Value;
    real_T Constant2_Value;
    real_T Constant3_Value;
    real_T Constant_Value;
    real_T ConstantUp_Value;
    real_T LimitUp_tableData[35];
    real_T LimitUp_bp01Data[7];
    real_T LimitUp_bp02Data[5];
    real_T LimitLo_tableData[35];
    real_T LimitLo_bp01Data[7];
    real_T LimitLo_bp02Data[5];
    real_T ConstantLo_Value;
    real_T LimitSwitchLo_Threshold;
    real_T FlareLawTailstrikeProtectionLimitLo_Value;
    real_T qk_dot_gain1_Gain;
    real_T qk_gain_HSP_Gain;
    real_T v_dot_gain_HSP_Gain;
    real_T Gain6_Gain;
    real_T precontrol_gain_HSP_Gain;
    real_T HSP_gain_Gain;
    real_T Saturation4_UpperSat;
    real_T Saturation4_LowerSat;
    real_T Saturation8_UpperSat;
    real_T Saturation8_LowerSat;
    real_T Constant1_Value;
    real_T Saturation_UpperSat;
    real_T Saturation_LowerSat;
    real_T Constant1_Value_h;
    real_T Constant_Value_o;
    real_T Constant1_Value_k;
    real_T Constant_Value_p;
    real_T Gain3_Gain;
    real_T Gain1_Gain;
    real_T Gain1_Gain_l;
    real_T Gain1_Gain_e;
    real_T Vm_currentms_Value;
    real_T Gain_Gain;
    real_T uDLookupTable_tableData[7];
    real_T uDLookupTable_bp01Data[7];
    real_T Saturation3_UpperSat;
    real_T Saturation3_LowerSat;
    real_T Gain5_Gain;
    real_T Bias_Bias;
    real_T Gain_Gain_a;
    real_T Saturation_UpperSat_c;
    real_T Saturation_LowerSat_n;
    real_T Saturation1_UpperSat;
    real_T Saturation1_LowerSat;
    real_T Constant_Value_j;
    real_T Constant_Value_c;
    real_T Constant_Value_a;
    real_T Constant_Value_m;
    real_T Constant_Value_mo;
    real_T Gain2_Gain;
    real_T Gain1_Gain_m;
    real_T Saturation1_UpperSat_i;
    real_T Saturation1_LowerSat_h;
    real_T Loaddemand1_tableData[3];
    real_T Loaddemand1_bp01Data[3];
    real_T PLUT_tableData[2];
    real_T PLUT_bp01Data[2];
    real_T DLUT_tableData[2];
    real_T DLUT_bp01Data[2];
    real_T SaturationV_dot_UpperSat;
    real_T SaturationV_dot_LowerSat;
    real_T Gain_Gain_l;
    real_T SaturationSpoilers_UpperSat;
    real_T SaturationSpoilers_LowerSat;
    real_T Saturation_UpperSat_h;
    real_T Saturation_LowerSat_o;
    real_T Gain3_Gain_m;
    real_T Gain1_Gain_o;
    real_T Vm_currentms_Value_e;
    real_T Gain_Gain_al;
    real_T uDLookupTable_tableData_e[7];
    real_T uDLookupTable_bp01Data_o[7];
    real_T Saturation3_UpperSat_a;
    real_T Saturation3_LowerSat_l;
    real_T Gain5_Gain_d;
    real_T Bias_Bias_a;
    real_T PLUT_tableData_b[2];
    real_T PLUT_bp01Data_b[2];
    real_T DLUT_tableData_p[2];
    real_T DLUT_bp01Data_h[2];
    real_T SaturationV_dot_UpperSat_j;
    real_T SaturationV_dot_LowerSat_e;
    real_T Gain_Gain_j;
    real_T SaturationSpoilers_UpperSat_g;
    real_T SaturationSpoilers_LowerSat_j;
    real_T Saturation_UpperSat_hc;
    real_T Saturation_LowerSat_a;
    real_T Gain3_Gain_g;
    real_T Gain1_Gain_or;
    real_T Vm_currentms_Value_p;
    real_T Gain_Gain_h;
    real_T uDLookupTable_tableData_i[7];
    real_T uDLookupTable_bp01Data_h[7];
    real_T Saturation3_UpperSat_e;
    real_T Saturation3_LowerSat_f;
    real_T Gain5_Gain_m;
    real_T Bias_Bias_e;
    real_T Saturation_UpperSat_f;
    real_T Saturation_LowerSat_o1;
    real_T Gain1_Gain_lm;
    real_T PLUT_tableData_a[2];
    real_T PLUT_bp01Data_d[2];
    real_T DLUT_tableData_b[2];
    real_T DLUT_bp01Data_g[2];
    real_T SaturationV_dot_UpperSat_b;
    real_T SaturationV_dot_LowerSat_l;
    real_T Gain_Gain_ae;
    real_T SaturationSpoilers_UpperSat_i;
    real_T SaturationSpoilers_LowerSat_h;
    real_T Saturation_UpperSat_b;
    real_T Saturation_LowerSat_c;
    real_T Saturation_UpperSat_e;
    real_T Saturation_LowerSat_e;
    real_T Constant_Value_i;
    real_T Delay_InitialCondition;
    real_T Constant_Value_f;
    real_T Delay1_InitialCondition;
    real_T precontrol_gain_Gain;
    real_T alpha_err_gain_Gain;
    real_T Delay_InitialCondition_e;
    real_T Constant_Value_b;
    real_T Delay1_InitialCondition_g;
    real_T v_dot_gain_Gain;
    real_T qk_gain_Gain;
    real_T qk_dot_gain_Gain;
    real_T Saturation3_UpperSat_f;
    real_T Saturation3_LowerSat_c;
    real_T Saturation_UpperSat_eo;
    real_T Saturation_LowerSat_h;
    real_T Constant_Value_fe;
    real_T Constant_Value_e;
    real_T GainUp_Gain;
    real_T LimitSwitchUp_Threshold;
    real_T Gain3_Gain_f;
    real_T Gain1_Gain_i;
    real_T Vm_currentms_Value_j;
    real_T Gain_Gain_i;
    real_T uDLookupTable_tableData_a[7];
    real_T uDLookupTable_bp01Data_c[7];
    real_T Saturation3_UpperSat_l;
    real_T Saturation3_LowerSat_lu;
    real_T Gain5_Gain_g;
    real_T Bias_Bias_g;
    real_T Gain_Gain_d;
    real_T PLUT_tableData_bb[2];
    real_T PLUT_bp01Data_k[2];
    real_T DLUT_tableData_bf[2];
    real_T DLUT_bp01Data_f[2];
    real_T SaturationV_dot_UpperSat_d;
    real_T SaturationV_dot_LowerSat_g;
    real_T Gain_Gain_m;
    real_T SaturationSpoilers_UpperSat_m;
    real_T SaturationSpoilers_LowerSat_b;
    real_T Saturation_UpperSat_cm;
    real_T Saturation_LowerSat_p;
    real_T GainLo_Gain;
    real_T Saturation_UpperSat_l;
    real_T Saturation_LowerSat_j;
    real_T Constant_Value_jg;
    real_T Gain3_Gain_c;
    real_T Gain1_Gain_en;
    real_T Vm_currentms_Value_h;
    real_T Gain_Gain_b;
    real_T uDLookupTable_tableData_h[7];
    real_T uDLookupTable_bp01Data_b[7];
    real_T Saturation3_UpperSat_b;
    real_T Saturation3_LowerSat_e;
    real_T Gain5_Gain_e;
    real_T Bias_Bias_f;
    real_T Loaddemand_tableData[3];
    real_T Loaddemand_bp01Data[3];
    real_T Delay_InitialCondition_c;
    real_T Constant_Value_ja;
    real_T Delay1_InitialCondition_gf;
    real_T Delay_InitialCondition_h;
    real_T Constant_Value_jj;
    real_T Delay1_InitialCondition_e;
    real_T Switch2_Threshold;
    real_T Saturation_UpperSat_ey;
    real_T Saturation_LowerSat_m;
    real_T Constant_Value_mr;
    real_T PLUT_tableData_k[2];
    real_T PLUT_bp01Data_f[2];
    real_T DLUT_tableData_a[2];
    real_T DLUT_bp01Data_m[2];
    real_T SaturationV_dot_UpperSat_bx;
    real_T SaturationV_dot_LowerSat_m;
    real_T Gain_Gain_f;
    real_T SaturationSpoilers_UpperSat_o;
    real_T SaturationSpoilers_LowerSat_jl;
    real_T Saturation_UpperSat_k;
    real_T Saturation_LowerSat_p1;
    real_T Gain3_Gain_b;
    real_T Gain1_Gain_b;
    real_T Vm_currentms_Value_pb;
    real_T Gain_Gain_p;
    real_T uDLookupTable_tableData_p[7];
    real_T uDLookupTable_bp01Data_a[7];
    real_T Saturation3_UpperSat_n;
    real_T Saturation3_LowerSat_a;
    real_T Gain5_Gain_n;
    real_T Bias_Bias_ai;
    real_T PLUT_tableData_o[2];
    real_T PLUT_bp01Data_a[2];
    real_T DLUT_tableData_e[2];
    real_T DLUT_bp01Data_k[2];
    real_T SaturationV_dot_UpperSat_m;
    real_T SaturationV_dot_LowerSat_ek;
    real_T Gain_Gain_k;
    real_T SaturationSpoilers_UpperSat_h;
    real_T SaturationSpoilers_LowerSat_l;
    real_T Saturation_UpperSat_j;
    real_T Saturation_LowerSat_d;
    real_T Gain3_Gain_n;
    real_T Gain1_Gain_lk;
    real_T Vm_currentms_Value_b;
    real_T Gain_Gain_jq;
    real_T uDLookupTable_tableData_ax[7];
    real_T uDLookupTable_bp01Data_m[7];
    real_T Saturation3_UpperSat_ev;
    real_T Saturation3_LowerSat_k;
    real_T Gain5_Gain_mu;
    real_T Bias_Bias_m;
    real_T Theta_max3_Value;
    real_T Gain3_Gain_g2;
    real_T Saturation2_UpperSat;
    real_T Saturation2_LowerSat;
    real_T Loaddemand2_tableData[3];
    real_T Loaddemand2_bp01Data[3];
    real_T PLUT_tableData_g[2];
    real_T PLUT_bp01Data_e[2];
    real_T DLUT_tableData_l[2];
    real_T DLUT_bp01Data_hw[2];
    real_T SaturationV_dot_UpperSat_j2;
    real_T SaturationV_dot_LowerSat_n;
    real_T Gain_Gain_l0;
    real_T SaturationSpoilers_UpperSat_mf;
    real_T SaturationSpoilers_LowerSat_d;
    real_T Saturation_UpperSat_a;
    real_T Saturation_LowerSat_k;
    real_T Switch_Threshold;
    real_T Saturation_UpperSat_la;
    real_T Saturation_LowerSat_kp;
    real_T Constant_Value_o1;
    real_T Constant2_Value_k;
    real_T uDLookupTable_tableData_e5[25];
    real_T uDLookupTable_bp01Data_l[5];
    real_T uDLookupTable_bp02Data[5];
    real_T Saturation3_UpperSat_lt;
    real_T Saturation3_LowerSat_h;
    real_T PitchRateDemand_tableData[3];
    real_T PitchRateDemand_bp01Data[3];
    real_T Gain3_Gain_e;
    real_T Gain_Gain_pt;
    real_T Gain1_Gain_d;
    real_T Gain1_Gain_a;
    real_T Gain5_Gain_h;
    real_T Gain4_Gain;
    real_T Gain6_Gain_g;
    real_T Constant_Value_jk;
    real_T Saturation_UpperSat_m;
    real_T Saturation_LowerSat_b;
    real_T Constant_Value_h;
    real_T Saturation_UpperSat_kp;
    real_T Saturation_LowerSat_a4;
    real_T Gain_Gain_c;
    uint32_T LimitUp_maxIndex[2];
    uint32_T LimitLo_maxIndex[2];
    uint32_T uDLookupTable_maxIndex[2];
    uint8_T SwitchTheta_cDebug_CurrentSetting;
    uint8_T ManualSwitch_CurrentSetting;
    uint8_T ManualSwitch1_CurrentSetting;
  };

  void init();
  PitchNormalLaw(PitchNormalLaw const&) = delete;
  PitchNormalLaw& operator= (PitchNormalLaw const&) & = delete;
  PitchNormalLaw(PitchNormalLaw &&) = delete;
  PitchNormalLaw& operator= (PitchNormalLaw &&) = delete;
  void step(const real_T *rtu_In_time_dt, const real_T *rtu_In_nz_g, const real_T *rtu_In_Theta_deg, const real_T
            *rtu_In_Phi_deg, const real_T *rtu_In_qk_deg_s, const real_T *rtu_In_qk_dot_deg_s2, const real_T
            *rtu_In_eta_deg, const real_T *rtu_In_eta_trim_deg, const real_T *rtu_In_alpha_deg, const real_T
            *rtu_In_V_ias_kn, const real_T *rtu_In_V_tas_kn, const real_T *rtu_In_H_radio_ft, const real_T
            *rtu_In_flaps_handle_index, const real_T *rtu_In_spoilers_left_pos, const real_T *rtu_In_spoilers_right_pos,
            const real_T *rtu_In_thrust_lever_1_pos, const real_T *rtu_In_thrust_lever_2_pos, const boolean_T
            *rtu_In_tailstrike_protection_on, const real_T *rtu_In_VLS_kn, const real_T *rtu_In_delta_eta_pos, const
            boolean_T *rtu_In_on_ground, const real_T *rtu_In_in_flight, const boolean_T *rtu_In_tracking_mode_on, const
            boolean_T *rtu_In_high_aoa_prot_active, const boolean_T *rtu_In_high_speed_prot_active, const real_T
            *rtu_In_alpha_prot, const real_T *rtu_In_alpha_max, const real_T *rtu_In_high_speed_prot_high_kn, const
            real_T *rtu_In_high_speed_prot_low_kn, const real_T *rtu_In_ap_theta_c_deg, const boolean_T
            *rtu_In_any_ap_engaged, real_T *rty_Out_eta_deg, real_T *rty_Out_eta_trim_dot_deg_s, real_T
            *rty_Out_eta_trim_limit_lo, real_T *rty_Out_eta_trim_limit_up);
  void reset();
  PitchNormalLaw();
  ~PitchNormalLaw();
 private:
  BlockIO_PitchNormalLaw_T PitchNormalLaw_B;
  D_Work_PitchNormalLaw_T PitchNormalLaw_DWork;
  static Parameters_PitchNormalLaw_T PitchNormalLaw_rtP;
  static void PitchNormalLaw_LagFilter_Reset(rtDW_LagFilter_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_LagFilter(const real_T *rtu_U, real_T rtu_C1, const real_T *rtu_dt, real_T *rty_Y,
    rtDW_LagFilter_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_RateLimiter_Reset(rtDW_RateLimiter_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_RateLimiter(real_T rtu_u, real_T rtu_up, real_T rtu_lo, const real_T *rtu_Ts, real_T
    rtu_init, real_T *rty_Y, rtDW_RateLimiter_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_eta_trim_limit_lofreeze_Reset(rtDW_eta_trim_limit_lofreeze_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_eta_trim_limit_lofreeze(const real_T *rtu_eta_trim, const boolean_T *rtu_trigger, real_T
    *rty_y, rtDW_eta_trim_limit_lofreeze_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_LagFilter_i_Reset(rtDW_LagFilter_PitchNormalLaw_d_T *localDW);
  static void PitchNormalLaw_LagFilter_n(real_T rtu_U, real_T rtu_C1, const real_T *rtu_dt, real_T *rty_Y,
    rtDW_LagFilter_PitchNormalLaw_d_T *localDW);
  static void PitchNormalLaw_WashoutFilter_Reset(rtDW_WashoutFilter_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_WashoutFilter(real_T rtu_U, real_T rtu_C1, const real_T *rtu_dt, real_T *rty_Y,
    rtDW_WashoutFilter_PitchNormalLaw_T *localDW);
  static void PitchNormalLaw_RateLimiter_a_Reset(rtDW_RateLimiter_PitchNormalLaw_a_T *localDW);
  static void PitchNormalLaw_RateLimiter_f(const real_T *rtu_u, real_T rtu_up, real_T rtu_lo, const real_T *rtu_Ts,
    real_T rtu_init, real_T *rty_Y, rtDW_RateLimiter_PitchNormalLaw_a_T *localDW);
  static void PitchNormalLaw_VoterAttitudeProtection(real_T rtu_input, real_T rtu_input_l, real_T rtu_input_o, real_T
    *rty_vote);
};

extern PitchNormalLaw::Parameters_PitchNormalLaw_T PitchNormalLaw_rtP;

#endif

