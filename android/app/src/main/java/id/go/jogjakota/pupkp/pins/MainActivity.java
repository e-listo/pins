package id.go.jogjakota.pupkp.pins;

import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        // Force WebView to ignore SSL errors for self-signed certificates
        WebView webView = this.getBridge().getWebView();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
                // HATI-HATI: Ini akan menerima semua sertifikat SSL (termasuk yang tidak valid)
                handler.proceed();
            }
        });
    }
}
