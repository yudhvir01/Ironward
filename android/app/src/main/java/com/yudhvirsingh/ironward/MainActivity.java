package com.yudhvirsingh.ironward;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // Local plugins are registered before the bridge starts.
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ApkInstallerPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
