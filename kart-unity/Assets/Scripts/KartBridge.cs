using UnityEngine;

/// <summary>Jembatan ke Activity Android: hasil balapan pulang ke WebView lewat setResult.</summary>
public static class KartBridge
{
    public static void Finish(string json)
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
        using var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
        activity.Call("finishRace", json);
#else
        Debug.Log("KartBridge.Finish " + json);
#endif
    }
}
